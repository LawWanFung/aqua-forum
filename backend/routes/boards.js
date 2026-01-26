const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Board = require("../models/Board");
const Post = require("../models/Post");
const { protect, admin } = require("../middleware/auth");
const { cache, redisClient } = require("../utils/redis");

// 預設看板資料
const defaultBoards = [
  {
    name: "魚類討論",
    slug: "fish",
    icon: "🐟",
    color: "#2196f3",
    description: "關於觀賞魚的討論",
  },
  {
    name: "蝦類討論",
    slug: "shrimp",
    icon: "🦐",
    color: "#ff9800",
    description: "關於觀賞蝦的討論",
  },
  {
    name: "水草專區",
    slug: "plant",
    icon: "🌿",
    color: "#4caf50",
    description: "水草種植與造景",
  },
  {
    name: "螺類貝類",
    slug: "snail",
    icon: "🐚",
    color: "#795548",
    description: "關於螺類和貝類的討論",
  },
  {
    name: "設備器材",
    slug: "equipment",
    icon: "⚙️",
    color: "#607d8b",
    description: "過濾器、燈具、CO2設備等",
  },
  {
    name: "疾病健康",
    slug: "disease",
    icon: "🏥",
    color: "#e91e63",
    description: "魚類疾病治療與預防",
  },
  {
    name: "一般討論",
    slug: "general",
    icon: "💬",
    color: "#9c27b0",
    description: "其他水族相關話題",
  },
  {
    name: "交易專區",
    slug: "marketplace",
    icon: "🏷️",
    color: "#f44336",
    description: "物品買賣與交換",
  },
  {
    name: "作品分享",
    slug: "showcase",
    icon: "🖼️",
    color: "#00bcd4",
    description: "分享你的水族缸照片",
  },
];

// @route   GET /api/boards
// @desc    取得所有啟用的看板列表
// @access  Public
router.get("/", async (req, res) => {
  try {
    const boards = await Board.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("-createdAt -updatedAt");

    res.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    console.error("Get Boards Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "取得看板列表失敗",
      },
    });
  }
});

// @route   GET /api/boards/all
// @desc    取得所有看板（包括停用的）- 管理員用
// @access  Private/Admin
router.get("/all", protect, admin, async (req, res) => {
  try {
    const boards = await Board.find().sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    console.error("Get All Boards Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "取得看板列表失敗",
      },
    });
  }
});

// @route   GET /api/boards/slug/:slug
// @desc    取得單個看板
// @access  Public
router.get("/slug/:slug", async (req, res) => {
  try {
    const board = await Board.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "看板不存在",
        },
      });
    }

    res.json({
      success: true,
      data: board,
    });
  } catch (error) {
    console.error("Get Board Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "取得看板失敗",
      },
    });
  }
});

// @route   GET /api/boards/:id
// @desc    取得單個看板（用 ID）
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "看板不存在",
        },
      });
    }

    res.json({
      success: true,
      data: board,
    });
  } catch (error) {
    console.error("Get Board Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "取得看板失敗",
      },
    });
  }
});

// @route   POST /api/boards
// @desc    建立看板
// @access  Private/Admin
router.post(
  "/",
  protect,
  admin,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("看板名稱為必填")
      .isLength({ max: 50 })
      .withMessage("看板名稱不能超過50個字符"),
    body("slug")
      .trim()
      .notEmpty()
      .withMessage("看板代碼為必填")
      .isLength({ max: 50 })
      .withMessage("看板代碼不能超過50個字符"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "驗證失敗",
            details: errors.array(),
          },
        });
      }

      const { name, slug, description, icon, color, sortOrder } = req.body;

      // 檢查 slug 是否已存在
      const existingBoard = await Board.findOne({ slug });
      if (existingBoard) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DUPLICATE_ERROR",
            message: "看板代碼已存在",
          },
        });
      }

      const board = await Board.create({
        name,
        slug,
        description,
        icon,
        color,
        sortOrder: sortOrder || 0,
      });

      // 清除看板快取
      await cache.del("boards:list");

      res.status(201).json({
        success: true,
        data: board,
        message: "看板建立成功",
      });
    } catch (error) {
      console.error("Create Board Error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "建立看板失敗",
        },
      });
    }
  },
);

// @route   PUT /api/boards/reorder
// @desc    重新排序看板
// @access  Private/Admin
router.put("/reorder", protect, admin, async (req, res) => {
  try {
    const { boardOrders } = req.body; // [{ id: "xxx", sortOrder: 0 }, ...]

    if (!Array.isArray(boardOrders)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "無效的排序資料",
        },
      });
    }

    const bulkOps = boardOrders.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));

    await Board.bulkWrite(bulkOps);

    // 清除快取
    await cache.del("boards:list");

    res.json({
      success: true,
      message: "排序更新成功",
    });
  } catch (error) {
    console.error("Reorder Boards Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "更新排序失敗",
      },
    });
  }
});

// @route   PUT /api/boards/:id
// @desc    更新看板
// @access  Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    let board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "看板不存在",
        },
      });
    }

    const { name, slug, description, icon, color, sortOrder, isActive } =
      req.body;

    // 如果要修改 slug，檢查是否已存在
    if (slug && slug !== board.slug) {
      const existingBoard = await Board.findOne({ slug });
      if (existingBoard) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DUPLICATE_ERROR",
            message: "看板代碼已存在",
          },
        });
      }
    }

    board = await Board.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name || board.name,
          slug: slug || board.slug,
          description:
            description !== undefined ? description : board.description,
          icon: icon || board.icon,
          color: color || board.color,
          sortOrder: sortOrder !== undefined ? sortOrder : board.sortOrder,
          isActive: isActive !== undefined ? isActive : board.isActive,
        },
      },
      { new: true, runValidators: true },
    );

    // 清除快取
    await cache.del(`board:${req.params.id}`);
    await cache.del(`board:slug:${board.slug}`);
    await cache.del("boards:list");

    res.json({
      success: true,
      data: board,
      message: "看板更新成功",
    });
  } catch (error) {
    console.error("Update Board Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "更新看板失敗",
      },
    });
  }
});

// @route   DELETE /api/boards/:id
// @desc    刪除看板
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "看板不存在",
        },
      });
    }

    // 移除文章中的看板引用
    await Post.updateMany(
      { boards: req.params.id },
      { $pull: { boards: req.params.id } },
    );

    await Board.findByIdAndDelete(req.params.id);

    // 清除快取
    await cache.del("boards:list");

    res.json({
      success: true,
      message: "看板刪除成功",
    });
  } catch (error) {
    console.error("Delete Board Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "刪除看板失敗",
      },
    });
  }
});

// @route   POST /api/boards/init
// @desc    初始化預設看板（只會建立不存在的）
// @access  Private/Admin
router.post("/init", protect, admin, async (req, res) => {
  try {
    const createdBoards = [];
    const skippedBoards = [];

    for (const boardData of defaultBoards) {
      const existingBoard = await Board.findOne({
        $or: [{ slug: boardData.slug }, { name: boardData.name }],
      });

      if (existingBoard) {
        skippedBoards.push(boardData.name);
      } else {
        const board = await Board.create(boardData);
        createdBoards.push(board);
      }
    }

    // 清除快取
    await cache.del("boards:list");

    res.json({
      success: true,
      data: {
        created: createdBoards.length,
        skipped: skippedBoards.length,
        createdBoards,
        skippedBoards,
      },
      message: `成功建立 ${createdBoards.length} 個看板`,
    });
  } catch (error) {
    console.error("Init Boards Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "初始化看板失敗",
      },
    });
  }
});

// @route   PUT /api/boards/:id/toggle
// @desc    啟用/停用看板
// @access  Private/Admin
router.put("/:id/toggle", protect, admin, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "看板不存在",
        },
      });
    }

    board.isActive = !board.isActive;
    await board.save();

    // 清除快取
    await cache.del(`board:${req.params.id}`);
    await cache.del("boards:list");

    res.json({
      success: true,
      data: board,
      message: board.isActive ? "看板已啟用" : "看板已停用",
    });
  } catch (error) {
    console.error("Toggle Board Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "切換看板狀態失敗",
      },
    });
  }
});

module.exports = router;
