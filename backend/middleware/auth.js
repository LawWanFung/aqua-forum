const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: "NOT_AUTHORIZED",
            message: "User not found",
          },
        });
      }

      next();
    } catch (error) {
      console.error("Auth Error:", error.message);
      return res.status(401).json({
        success: false,
        error: {
          code: "NOT_AUTHORIZED",
          message: "Not authorized, token failed",
        },
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "NOT_AUTHORIZED",
        message: "Not authorized, no token provided",
      },
    });
  }
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.role === "admin")) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required",
      },
    });
  }
};

// Moderator middleware
const moderator = (req, res, next) => {
  if (
    req.user &&
    (req.user.isAdmin ||
      req.user.role === "admin" ||
      req.user.role === "moderator")
  ) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Moderator access required",
      },
    });
  }
};

module.exports = { protect, generateToken, admin, moderator };
