const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Photo = require("../models/Photo");
const Tag = require("../models/Tag");
const { protect, admin } = require("../middleware/auth");
const { cache } = require("../utils/redis");

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Admin
router.get("/stats", protect, admin, async (req, res) => {
  try {
    const [
      userCount,
      postCount,
      photoCount,
      tagCount,
      activeUsers,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Photo.countDocuments(),
      Tag.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: userCount,
          active: activeUsers,
          newToday: newUsersToday,
        },
        posts: postCount,
        photos: photoCount,
        tags: tagCount,
      },
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error fetching admin stats",
      },
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin)
// @access  Admin
router.get("/users", protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error fetching users",
      },
    });
  }
});

// @route   PUT /api/admin/users/:userId
// @desc    Update user (admin)
// @access  Admin
router.put("/users/:userId", protect, admin, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updateFields = {};

    if (role) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateFields },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Invalidate cache
    await cache.delPattern("users:*");

    res.json({
      success: true,
      data: user,
      message: "User updated successfully",
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
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user (admin)
// @access  Admin
router.delete("/users/:userId", protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Clean up user's posts and photos
    await Post.deleteMany({ user: req.params.userId });
    await Photo.deleteMany({ user: req.params.userId });

    // Invalidate cache
    await cache.delPattern("users:*");

    res.json({
      success: true,
      message: "User and associated content deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting user",
      },
    });
  }
});

// @route   GET /api/admin/posts
// @desc    Get all posts (admin)
// @access  Admin
router.get("/posts", protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, reported } = req.query;

    const query = {};
    if (userId) query.user = userId;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username email");

    const total = await Post.countDocuments(query);

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
    console.error("Get Posts Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error fetching posts",
      },
    });
  }
});

// @route   DELETE /api/admin/posts/:postId
// @desc    Delete post (admin)
// @access  Admin
router.delete("/posts/:postId", protect, admin, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Post not found",
        },
      });
    }

    // Update user's post count
    await User.findByIdAndUpdate(post.user, {
      $inc: { "stats.postCount": -1 },
    });

    // Invalidate cache
    await cache.del(`post:${req.params.postId}`);
    await cache.delPattern("posts:*");

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting post",
      },
    });
  }
});

// @route   GET /api/admin/photos
// @desc    Get all photos (admin)
// @access  Admin
router.get("/photos", protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const photos = await Photo.find()
      .sort({ "metadata.uploadedAt": -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username email");

    const total = await Photo.countDocuments();

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
        message: "Error fetching photos",
      },
    });
  }
});

// @route   DELETE /api/admin/photos/:photoId
// @desc    Delete photo (admin)
// @access  Admin
router.delete("/photos/:photoId", protect, admin, async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Photo not found",
        },
      });
    }

    // Update user's photo count
    await User.findByIdAndUpdate(photo.user, {
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

// @route   GET /api/admin/tags
// @desc    Get all tags (admin)
// @access  Admin
router.get("/tags", protect, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const tags = await Tag.find(query)
      .sort({ usageCount: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tag.countDocuments(query);

    res.json({
      success: true,
      data: {
        tags,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Tags Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error fetching tags",
      },
    });
  }
});

// @route   DELETE /api/admin/tags/:tagId
// @desc    Delete tag (admin)
// @access  Admin
router.delete("/tags/:tagId", protect, admin, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.tagId);

    if (!tag) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Tag not found",
        },
      });
    }

    // Remove tag from all posts
    await Post.updateMany(
      { "tags.tag": tag.name },
      { $pull: { tags: { tag: tag.name } } },
    );

    await Tag.findByIdAndDelete(req.params.tagId);

    // Invalidate caches
    await cache.delPattern("tags:*");

    res.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Delete Tag Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting tag",
      },
    });
  }
});

module.exports = router;
