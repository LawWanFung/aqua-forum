const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    aquariumType: {
      type: String,
      enum: ["Freshwater", "Saltwater", "Planted", "Other"],
      default: "Other",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    metadata: {
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      likes: {
        type: Number,
        default: 0,
      },
      views: {
        type: Number,
        default: 0,
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for performance
photoSchema.index({ user: 1, "metadata.uploadedAt": -1 });
photoSchema.index({ tags: 1 });
photoSchema.index({ aquariumType: 1 });

module.exports = mongoose.model("Photo", photoSchema);
