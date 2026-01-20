const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Post = require("../models/Post");
const Photo = require("../models/Photo");
const { protect } = require("../middleware/auth");

// @route   GET /api/users/:userId
// @desc    Get user profile
// @access  Public
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-email");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting user",
      },
    });
  }
});

// @route   PUT /api/users/:userId
// @desc    Update user profile
// @access  Private
router.put(
  "/:userId",
  protect,
  [
    body("username").optional().trim().isLength({ min: 3, max: 30 }),
    body("bio").optional().isLength({ max: 500 }),
    body("location").optional().isLength({ max: 100 }),
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

      // Check ownership
      if (req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Not authorized to update this profile",
          },
        });
      }

      const { username, bio, location, avatar, preferences } = req.body;
      const updateFields = {};

      if (username) updateFields.username = username;
      if (bio !== undefined) updateFields["profile.bio"] = bio;
      if (location !== undefined) updateFields["profile.location"] = location;
      if (avatar !== undefined) updateFields["profile.avatar"] = avatar;
      if (preferences)
        updateFields["profile.preferences"] = {
          ...req.user.profile.preferences,
          ...preferences,
        };

      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { $set: updateFields },
        { new: true, runValidators: true },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      }

      res.json({
        success: true,
        data: user,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Error updating user",
        },
      });
    }
  },
);

// @route   GET /api/users/:userId/photos
// @desc    Get user's photo gallery
// @access  Public
router.get("/:userId/photos", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const photos = await Photo.find({ user: req.params.userId })
      .sort({ "metadata.uploadedAt": -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments({ user: req.params.userId });

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
    console.error("Get User Photos Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting user photos",
      },
    });
  }
});

// @route   GET /api/users/:userId/posts
// @desc    Get user's posts
// @access  Public
router.get("/:userId/posts", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find({ user: req.params.userId })
      .sort({ "metadata.createdAt": -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ user: req.params.userId });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get User Posts Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting user posts",
      },
    });
  }
});

// @route   GET /api/users/:userId/bookmarks
// @desc    Get user's bookmarked posts
// @access  Private (only owner)
router.get("/:userId/bookmarks", protect, async (req, res) => {
  try {
    // Check ownership
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to view these bookmarks",
        },
      });
    }

    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find({ "engagement.bookmarks": req.user._id })
      .sort({ "metadata.createdAt": -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username profile.avatar");

    const total = await Post.countDocuments({
      "engagement.bookmarks": req.user._id,
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get User Bookmarks Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting user bookmarks",
      },
    });
  }
});

module.exports = router;
