const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [50, "Tag name cannot exceed 50 characters"],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for performance
tagSchema.index({ name: 1 }, { unique: true });
tagSchema.index({ usageCount: -1 });
tagSchema.index({ category: 1 });

// Increment usage count method
tagSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  await this.save();
};

// Static method to find or create tag
tagSchema.statics.findOrCreate = async function (name, category = "other") {
  const normalizedName = name.toLowerCase().trim();
  let tag = await this.findOne({ name: normalizedName });
  if (!tag) {
    tag = await this.create({ name: normalizedName, category });
  }
  return tag;
};

module.exports = mongoose.model("Tag", tagSchema);
