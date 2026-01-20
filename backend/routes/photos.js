const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Photo = require("../models/Photo");
const User = require("../models/User");
const Tag = require("../models/Tag");
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

// @route   POST /api/photos/upload
// @desc    Upload photo
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

    const { title, description, aquariumType, tags } = req.body;

    // Build image URL (use local path for now)
    const imageUrl = `/uploads/${req.file.filename}`;
    const thumbnailUrl = imageUrl;

    // Get image variants if using Cloudinary
    const variants = getImageVariants(imageUrl);

    // Merge manual tags with AI tags if Cloudinary is configured
    let allTags = tags
      ? typeof tags === "string"
        ? tags.split(",").map((t) => t.trim())
        : tags
      : [];

    // Try to get AI tags from Cloudinary if URL is a Cloudinary URL
    if (imageUrl.startsWith("http")) {
      const aiTags = await getAITags(imageUrl);
      const aiTagNames = aiTags.map((t) => t.tag);
      allTags = [...allTags, ...aiTagNames];
    }

    const photo = await Photo.create({
      user: req.user._id,
      imageUrl,
      thumbnailUrl: variants.thumbnail || thumbnailUrl,
      title,
      description: description || "",
      aquariumType: aquariumType || "Other",
      tags: allTags,
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

    res.status(201).json({
      success: true,
      data: photo,
      message: "Photo uploaded successfully",
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
    const { page = 1, limit = 20, aquariumType, userId } = req.query;

    const query = {};
    if (aquariumType) query.aquariumType = aquariumType;
    if (userId) query.user = userId;

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

    res.json({
      success: true,
      data: photo,
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
    if (tags) updateFields.tags = tags;

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
