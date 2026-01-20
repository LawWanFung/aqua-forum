const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Album = require("../models/Album");
const Photo = require("../models/Photo");
const { protect } = require("../middleware/auth");
const { cache } = require("../utils/redis");

// @route   GET /api/albums
// @desc    Get user's albums
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const albums = await Album.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Album.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        albums,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Albums Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting albums",
      },
    });
  }
});

// @route   GET /api/albums/public/:userId
// @desc    Get public albums by user
// @access  Public
router.get("/public/:userId", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const albums = await Album.find({
      user: req.params.userId,
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("coverPhoto");

    const total = await Album.countDocuments({
      user: req.params.userId,
      isPublic: true,
    });

    res.json({
      success: true,
      data: {
        albums,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Public Albums Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting albums",
      },
    });
  }
});

// @route   GET /api/albums/:albumId
// @desc    Get single album
// @access  Private (owner) or Public
router.get("/:albumId", async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId)
      .populate("user", "username profile.avatar")
      .populate({
        path: "photos",
        options: { sort: { "metadata.uploadedAt": -1 } },
      });

    if (!album) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Album not found",
        },
      });
    }

    // Check if album is public or user is owner
    const token = req.headers.authorization?.split(" ")[1];
    let isOwner = false;
    if (token) {
      const jwt = require("jsonwebtoken");
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id === album.user._id.toString()) {
          isOwner = true;
        }
      } catch (e) {}
    }

    if (!album.isPublic && !isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "This album is private",
        },
      });
    }

    res.json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error("Get Album Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting album",
      },
    });
  }
});

// @route   POST /api/albums
// @desc    Create new album
// @access  Private
router.post(
  "/",
  protect,
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Album name must be 1-100 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: errors.array(),
          },
        });
      }

      const { name, description, type, isPublic } = req.body;

      const album = await Album.create({
        user: req.user._id,
        name,
        description: description || "",
        type: type || "general",
        isPublic: isPublic !== false,
      });

      res.status(201).json({
        success: true,
        data: album,
        message: "Album created successfully",
      });
    } catch (error) {
      console.error("Create Album Error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Error creating album",
        },
      });
    }
  },
);

// @route   PUT /api/albums/:albumId
// @desc    Update album
// @access  Private
router.put("/:albumId", protect, async (req, res) => {
  try {
    let album = await Album.findById(req.params.albumId);

    if (!album) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Album not found",
        },
      });
    }

    // Check ownership
    if (album.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to update this album",
        },
      });
    }

    const { name, description, coverPhoto, isPublic, type } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (coverPhoto !== undefined) updateFields.coverPhoto = coverPhoto;
    if (isPublic !== undefined) updateFields.isPublic = isPublic;
    if (type) updateFields.type = type;

    album = await Album.findByIdAndUpdate(
      req.params.albumId,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: album,
      message: "Album updated successfully",
    });
  } catch (error) {
    console.error("Update Album Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error updating album",
      },
    });
  }
});

// @route   DELETE /api/albums/:albumId
// @desc    Delete album
// @access  Private
router.delete("/:albumId", protect, async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId);

    if (!album) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Album not found",
        },
      });
    }

    // Check ownership
    if (album.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to delete this album",
        },
      });
    }

    // Remove album reference from photos
    await Photo.updateMany(
      { _id: { $in: album.photos } },
      { $set: { album: null } },
    );

    await Album.findByIdAndDelete(req.params.albumId);

    res.json({
      success: true,
      message: "Album deleted successfully",
    });
  } catch (error) {
    console.error("Delete Album Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting album",
      },
    });
  }
});

// @route   POST /api/albums/:albumId/photos/:photoId
// @desc    Add photo to album
// @access  Private
router.post("/:albumId/photos/:photoId", protect, async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId);

    if (!album) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Album not found",
        },
      });
    }

    // Check ownership
    if (album.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized",
        },
      });
    }

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

    // Check ownership of photo
    if (photo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to add this photo",
        },
      });
    }

    // Add photo to album if not already there
    if (!album.photos.includes(photo._id)) {
      album.photos.push(photo._id);
      await album.save();

      // Update photo's album reference
      photo.album = album._id;
      await photo.save();

      // Update cover photo if this is the first photo
      if (!album.coverPhoto && photo.thumbnailUrl) {
        album.coverPhoto = photo.thumbnailUrl;
        await album.save();
      }
    }

    res.json({
      success: true,
      data: album,
      message: "Photo added to album",
    });
  } catch (error) {
    console.error("Add Photo to Album Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error adding photo to album",
      },
    });
  }
});

// @route   DELETE /api/albums/:albumId/photos/:photoId
// @desc    Remove photo from album
// @access  Private
router.delete("/:albumId/photos/:photoId", protect, async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId);

    if (!album) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Album not found",
        },
      });
    }

    // Check ownership
    if (album.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized",
        },
      });
    }

    // Remove photo from album
    album.photos = album.photos.filter(
      (p) => p.toString() !== req.params.photoId,
    );
    await album.save();

    // Update photo's album reference
    await Photo.findByIdAndUpdate(req.params.photoId, {
      $set: { album: null },
    });

    res.json({
      success: true,
      data: album,
      message: "Photo removed from album",
    });
  } catch (error) {
    console.error("Remove Photo from Album Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error removing photo from album",
      },
    });
  }
});

module.exports = router;
