const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "看板名稱為必填"],
      trim: true,
      maxlength: [50, "看板名稱不能超過50個字符"],
    },
    slug: {
      type: String,
      required: [true, "看板代碼為必填"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "描述不能超過200個字符"],
    },
    icon: {
      type: String,
      default: "📁",
    },
    color: {
      type: String,
      default: "#1976d2",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// 生成 slug 的中間件
boardSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// 索引
boardSchema.index({ sortOrder: 1, name: 1 });
boardSchema.index({ isActive: 1 });
boardSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Board", boardSchema);
