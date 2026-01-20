const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Album name is required"],
      trim: true,
      maxlength: [100, "Album name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photo",
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ["general", "aquarium", "events", "contest", "other"],
      default: "general",
    },
  },
  {
    timestamps: true,
  },
);

// Index for performance
albumSchema.index({ user: 1, createdAt: -1 });
albumSchema.index({ isPublic: 1 });

// Virtual for photo count
albumSchema.virtual("photoCount").get(function () {
  return this.photos.length;
});

// Ensure virtuals are included in JSON output
albumSchema.set("toJSON", { virtuals: true });
albumSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Album", albumSchema);
