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
    originalUrl: {
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
    // Vision LLM generated tags with confidence scores
    visionTags: [
      {
        tag: { type: String },
        confidence: { type: Number, min: 0, max: 1 },
      },
    ],
    // Vision processing status
    visionStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    visionError: {
      type: String,
      default: "",
    },
    visionStartedAt: {
      type: Date,
    },
    visionCompletedAt: {
      type: Date,
    },
    visionModel: {
      type: String,
      default: "",
    },
    visionProcessingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
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
      // Media provider information
      provider: {
        type: String,
        default: "cloudinary",
      },
      // Original file metadata
      originalSize: {
        type: Number, // bytes
        default: 0,
      },
      optimizedSize: {
        type: Number, // bytes
        default: 0,
      },
      compressionRatio: {
        type: Number, // percentage
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
photoSchema.index({ "metadata.visionStatus": 1 });
photoSchema.index({ "metadata.views": -1 });
photoSchema.index({ "metadata.likes": -1 });

// Virtual for variant URLs
photoSchema.virtual("variants", {
  ref: "Photo",
  localField: "_id",
  foreignField: "photo",
  justOne: false,
});

// Ensure virtuals are included when converting to JSON
photoSchema.set("toJSON", { virtuals: true });
photoSchema.set("toObject", { virtuals: true });

// Method to check if vision processing is complete
photoSchema.methods.isVisionProcessed = function () {
  return this.visionStatus === "completed";
};

// Method to get processing progress
photoSchema.methods.getProcessingProgress = function () {
  if (this.visionStatus === "pending") return 0;
  if (this.visionStatus === "processing") return 50;
  if (this.visionStatus === "completed") return 100;
  if (this.visionStatus === "failed") return -1;
  return 0;
};

module.exports = mongoose.model("Photo", photoSchema);
