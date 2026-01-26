const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const Photo = require("../models/Photo");
const User = require("../models/User");
const Tag = require("../models/Tag");
const { mediaService } = require("../utils/media");
const { getAITags, getImageVariants } = require("../utils/cloudinary");
const { protect } = require("../middleware/auth");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

/**
 * Resize image to max long side
 */
const resizeImage = async (inputPath, maxLongSide = 1024, quality = 85) => {
  try {
    const metadata = await sharp(inputPath).metadata();
    let resizeOptions = { fit: "inside", withoutEnlargement: true };

    if (maxLongSide > 0) {
      if (metadata.width > metadata.height) {
        resizeOptions.width = maxLongSide;
      } else {
        resizeOptions.height = maxLongSide;
      }
    }

    const outputPath = inputPath.replace(/(\.[^.]+)$/, `-resized${quality}$1`);

    await sharp(inputPath)
      .resize(resizeOptions)
      .jpeg({ quality, progressive: true })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Image resize error:", error);
    return inputPath;
  }
};

// @route   POST /api/photos/upload
// @desc    Upload photo with auto-tagging via vision LLM
// @access  Private
router.post("/upload", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_FILE",
          message: "Please upload an image file",
        },
      });
    }

    const { title, description, aquariumType, tags, enableAutoTagging } =
      req.body;

    // Resize image if configured
    const maxLongSide = parseInt(process.env.IMAGE_MAX_LONG_SIDE) || 1024;
    const imageQuality = parseInt(process.env.IMAGE_QUALITY) || 85;
    let processedFilePath = req.file.path;

    if (maxLongSide > 0) {
      processedFilePath = await resizeImage(
        req.file.path,
        maxLongSide,
        imageQuality,
      );
    }

    // Upload to media service (Cloudinary, ShortPixel, or local)
    const uploadResult = await mediaService.upload(processedFilePath, {
      userId: req.user._id.toString(),
      title,
      tags: tags ? (typeof tags === "string" ? tags.split(",") : tags) : [],
    });

    // Get image variants
    const variants = mediaService.getImageVariants(uploadResult.url);

    // Merge manual tags with AI tags if available
    let allTags = tags
      ? typeof tags === "string"
        ? tags.split(",").map((t) => t.trim())
        : tags
      : [];

    // Get AI tags from media provider (if configured)
    if (uploadResult.url.startsWith("http")) {
      const providerTags = await mediaService.getAITags(uploadResult.url);
      const providerTagNames = providerTags.map((t) => t.tag);
      allTags = [...allTags, ...providerTagNames];
    }

    // Create photo document
    const photo = await Photo.create({
      user: req.user._id,
      imageUrl: uploadResult.url,
      thumbnailUrl: variants.thumbnail || uploadResult.thumbnailUrl,
      originalUrl: uploadResult.originalUrl || uploadResult.url,
      title,
      description: description || "",
      aquariumType: aquariumType || "Other",
      tags: allTags,
      visionStatus: "pending",
      metadata: {
        provider: uploadResult.provider,
        originalSize: req.file.size,
        optimizedSize: uploadResult.metadata?.size || 0,
        compressionRatio: uploadResult.metadata?.compressionRatio || 0,
      },
    });

    // Update user's photo count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.photoCount": 1 },
    });

    // Track tag usage
    const uniqueTagNames = [...new Set(allTags.map((t) => t.toLowerCase()))];
    await Promise.all(
      uniqueTagNames.map(async (tagName) => {
        await Tag.findOneAndUpdate(
          { name: tagName },
          { $inc: { usageCount: 1 } },
          { upsert: true, new: true },
        );
      }),
    );

    // Auto tagging is disabled

    // Clean up temp resized file if different from original
    if (
      processedFilePath !== req.file.path &&
      fs.existsSync(processedFilePath)
    ) {
      // Keep the resized file for potential re-processing
    }

    res.status(201).json({
      success: true,
      data: photo,
      message: autoTaggingEnabled
        ? "Photo uploaded. Auto-tagging is processing in background."
        : "Photo uploaded successfully",
      uploadResult: {
        url: uploadResult.url,
        thumbnailUrl: variants.thumbnail,
        provider: uploadResult.provider,
      },
    });
  } catch (error) {
    console.error("Upload Photo Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error uploading photo",
      },
    });
  }
});

// @route   GET /api/photos
// @desc    Get all photos with pagination
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      aquariumType,
      userId,
      visionStatus,
    } = req.query;

    const query = {};
    if (aquariumType) query.aquariumType = aquariumType;
    if (userId) query.user = userId;
    if (visionStatus) query.visionStatus = visionStatus;

    const photos = await Photo.find(query)
      .sort({ "metadata.uploadedAt": -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username profile.avatar");

    const total = await Photo.countDocuments(query);

    res.json({
      success: true,
      data: {
        photos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Photos Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting photos",
      },
    });
  }
});

// @route   GET /api/photos/:photoId
// @desc    Get single photo
// @access  Public
router.get("/:photoId", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId).populate(
      "user",
      "username profile.avatar profile.bio",
    );

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Photo not found",
        },
      });
    }

    // Increment view count
    photo.metadata.views += 1;
    await photo.save();

    // Get image variants on demand
    const variants = getImageVariants(photo.imageUrl);

    res.json({
      success: true,
      data: {
        ...photo.toObject(),
        variants,
      },
    });
  } catch (error) {
    console.error("Get Photo Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting photo",
      },
    });
  }
});

// @route   PUT /api/photos/:photoId
// @desc    Update photo metadata
// @access  Private
router.put("/:photoId", protect, async (req, res) => {
  try {
    let photo = await Photo.findById(req.params.photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Photo not found",
        },
      });
    }

    // Check ownership
    if (photo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to update this photo",
        },
      });
    }

    const { title, description, aquariumType, tags } = req.body;
    const updateFields = {};

    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (aquariumType) updateFields.aquariumType = aquariumType;
    if (tags) {
      updateFields.tags = tags;
      // Update tag usage counts
      const uniqueTagNames = [...new Set(tags.map((t) => t.toLowerCase()))];
      await Promise.all(
        uniqueTagNames.map(async (tagName) => {
          await Tag.findOneAndUpdate(
            { name: tagName },
            { $inc: { usageCount: 1 } },
            { upsert: true, new: true },
          );
        }),
      );
    }

    photo = await Photo.findByIdAndUpdate(
      req.params.photoId,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).populate("user", "username profile.avatar");

    res.json({
      success: true,
      data: photo,
      message: "Photo updated successfully",
    });
  } catch (error) {
    console.error("Update Photo Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error updating photo",
      },
    });
  }
});

// @route   DELETE /api/photos/:photoId
// @desc    Delete photo
// @access  Private
router.delete("/:photoId", protect, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Photo not found",
        },
      });
    }

    // Check ownership
    if (photo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to delete this photo",
        },
      });
    }

    // Delete from media provider if URL is external
    if (photo.imageUrl && photo.imageUrl.startsWith("http")) {
      await mediaService.delete(photo.imageUrl);
    }

    // Delete local file if exists
    if (photo.imageUrl && !photo.imageUrl.startsWith("http")) {
      const filePath = path.join(__dirname, "..", photo.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Photo.findByIdAndDelete(req.params.photoId);

    // Update user's photo count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.photoCount": -1 },
    });

    res.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Delete Photo Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting photo",
      },
    });
  }
});

// @route   POST /api/photos/:photoId/like
// @desc    Like/unlike photo
// @access  Private
router.post("/:photoId/like", protect, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Photo not found",
        },
      });
    }

    const likeIndex = photo.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      photo.likes.splice(likeIndex, 1);
      photo.metadata.likes -= 1;
    } else {
      // Like
      photo.likes.push(req.user._id);
      photo.metadata.likes += 1;
    }

    await photo.save();

    res.json({
      success: true,
      data: {
        liked: likeIndex === -1,
        likeCount: photo.metadata.likes,
      },
      message: likeIndex === -1 ? "Photo liked" : "Photo unliked",
    });
  } catch (error) {
    console.error("Like Photo Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error liking photo",
      },
    });
  }
});

module.exports = router;
