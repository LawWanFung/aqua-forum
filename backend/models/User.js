const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    profile: {
      avatar: {
        type: String,
        default: "",
      },
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
        default: "",
      },
      location: {
        type: String,
        maxlength: [100, "Location cannot exceed 100 characters"],
        default: "",
      },
      joinDate: {
        type: Date,
        default: Date.now,
      },
      preferences: {
        darkMode: {
          type: Boolean,
          default: false,
        },
        notifications: {
          type: Boolean,
          default: true,
        },
      },
    },
    stats: {
      postCount: {
        type: Number,
        default: 0,
      },
      photoCount: {
        type: Number,
        default: 0,
      },
      followerCount: {
        type: Number,
        default: 0,
      },
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
