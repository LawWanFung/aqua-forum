const express = require("express");
const router = express.Router();
const { body, query, validationResult } = require("express-validator");
const Tag = require("../models/Tag");
const Post = require("../models/Post");
const { protect } = require("../middleware/auth");
const { cache } = require("../utils/redis");

// @route   GET /api/tags
// @desc    Get all tags with pagination
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;

    const query = {};
    if (category) query.category = category;

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
        message: "Error getting tags",
      },
    });
  }
});

// @route   GET /api/tags/popular
// @desc    Get popular/trending tags
// @access  Public
router.get("/popular", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Generate cache key
    const cacheKey = `tags:popular:${limit}`;

    // Try to get from cache
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const tags = await Tag.find()
      .sort({ usageCount: -1 })
      .limit(parseInt(limit));

    const responseData = {
      success: true,
      data: tags,
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, responseData, 600);

    res.json(responseData);
  } catch (error) {
    console.error("Get Popular Tags Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting popular tags",
      },
    });
  }
});

// @route   GET /api/tags/suggestions
// @desc    Get tag suggestions based on query
// @access  Public
router.get("/suggestions", async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const tags = await Tag.find({
      name: { $regex: q.toLowerCase(), $options: "i" },
    })
      .sort({ usageCount: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error("Get Tag Suggestions Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting tag suggestions",
      },
    });
  }
});

// @route   GET /api/tags/:tagId
// @desc    Get single tag
// @access  Public
router.get("/:tagId", async (req, res) => {
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

    // Get posts using this tag
    const posts = await Post.find({ "tags.tag": tag.name })
      .sort({ "metadata.createdAt": -1 })
      .limit(10)
      .populate("user", "username profile.avatar");

    res.json({
      success: true,
      data: {
        tag,
        posts,
      },
    });
  } catch (error) {
    console.error("Get Tag Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting tag",
      },
    });
  }
});

// @route   POST /api/tags
// @desc    Create new tag (admin only in production)
// @access  Private
router.post(
  "/",
  protect,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tag name must be 2-50 characters"),
    body("category")
      .optional()
      .isIn([
        "aquarium-type",
        "topic",
        "fish-species",
        "equipment",
        "disease",
        "other",
      ])
      .withMessage("Invalid category"),
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

      const { name, category, relatedTags } = req.body;
      const normalizedName = name.toLowerCase().trim();

      // Check if tag already exists
      const existingTag = await Tag.findOne({ name: normalizedName });
      if (existingTag) {
        return res.status(400).json({
          success: false,
          error: {
            code: "TAG_EXISTS",
            message: "Tag with this name already exists",
          },
        });
      }

      const tag = await Tag.create({
        name: normalizedName,
        category: category || "other",
        relatedTags: relatedTags || [],
      });

      res.status(201).json({
        success: true,
        data: tag,
        message: "Tag created successfully",
      });
    } catch (error) {
      console.error("Create Tag Error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Error creating tag",
        },
      });
    }
  },
);

// @route   PUT /api/tags/:tagId
// @desc    Update tag
// @access  Private
router.put("/:tagId", protect, async (req, res) => {
  try {
    const { name, category, relatedTags } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name.toLowerCase().trim();
    if (category) updateFields.category = category;
    if (relatedTags) updateFields.relatedTags = relatedTags;

    const tag = await Tag.findByIdAndUpdate(
      req.params.tagId,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Tag not found",
        },
      });
    }

    // Invalidate caches
    await cache.delPattern("tags:*");

    res.json({
      success: true,
      data: tag,
      message: "Tag updated successfully",
    });
  } catch (error) {
    console.error("Update Tag Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error updating tag",
      },
    });
  }
});

// @route   DELETE /api/tags/:tagId
// @desc    Delete tag
// @access  Private
router.delete("/:tagId", protect, async (req, res) => {
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
