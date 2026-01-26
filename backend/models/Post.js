const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    boards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Board",
      },
    ],
    tags: [
      {
        tag: {
          type: String,
          trim: true,
        },
      },
    ],
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
      likeCount: {
        type: Number,
        default: 0,
      },
      commentCount: {
        type: Number,
        default: 0,
      },
      isPinned: {
        type: Boolean,
        default: false,
      },
    },
    engagement: {
      likes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      bookmarks: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for performance
postSchema.index({ "metadata.createdAt": -1 });
postSchema.index({ user: 1 });
postSchema.index({ boards: 1 });
postSchema.index({ "tags.tag": 1 });
postSchema.index({ "metadata.likeCount": -1 });

// Update the updatedAt timestamp before saving
postSchema.pre("save", function (next) {
  this.metadata.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Post", postSchema);
