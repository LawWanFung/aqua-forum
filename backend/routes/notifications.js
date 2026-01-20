const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const { cache } = require("../utils/redis");

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: req.user._id };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("fromUser", "username profile.avatar")
      .populate("post", "title");

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting notifications",
      },
    });
  }
});

// @route   GET /api/notifications/count
// @desc    Get unread notification count
// @access  Private
router.get("/count", protect, async (req, res) => {
  try {
    const cacheKey = `notifications:count:${req.user._id}`;

    // Try cache first
    const cachedCount = await cache.get(cacheKey);
    if (cachedCount) {
      return res.json(cachedCount);
    }

    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    const responseData = {
      success: true,
      data: { count },
    };

    // Cache for 1 minute
    await cache.set(cacheKey, responseData, 60);

    res.json(responseData);
  } catch (error) {
    console.error("Get Notification Count Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error getting notification count",
      },
    });
  }
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put("/:notificationId/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Notification not found",
        },
      });
    }

    notification.read = true;
    await notification.save();

    // Invalidate count cache
    await cache.del(`notifications:count:${req.user._id}`);

    res.json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error marking notification as read",
      },
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );

    // Invalidate count cache
    await cache.del(`notifications:count:${req.user._id}`);

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error marking all notifications as read",
      },
    });
  }
});

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete notification
// @access  Private
router.delete("/:notificationId", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Notification not found",
        },
      });
    }

    // Invalidate count cache
    await cache.del(`notifications:count:${req.user._id}`);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error deleting notification",
      },
    });
  }
});

// Helper function to create notification
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);

    // Clear user's notification count cache
    await cache.del(`notifications:count:${data.user}`);

    return notification;
  } catch (error) {
    console.error("Create Notification Error:", error);
    return null;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
