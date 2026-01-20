const redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

// Check if Redis is disabled
const redisDisabled = process.env.REDIS_URL === "false";

// Create Redis client only if Redis is not disabled
let redisClient = null;

if (!redisDisabled) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => console.error("Redis Client Error:", err));

  redisClient.on("connect", () => console.log("Redis connected"));
}

// Connect to Redis
const connectRedis = async () => {
  if (redisDisabled || !redisClient) {
    console.log("Redis is disabled");
    return null;
  }

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    // Return null to allow app to continue without Redis
    return null;
  }
};

// Cache helper functions
const cache = {
  // Set cache with optional expiration (default 5 minutes)
  async set(key, value, expirationSeconds = 300) {
    if (redisDisabled || !redisClient || !redisClient.isOpen) return;
    try {
      const stringValue = JSON.stringify(value);
      await redisClient.setEx(key, expirationSeconds, stringValue);
    } catch (error) {
      console.error("Cache set error:", error.message);
    }
  },

  // Get cache
  async get(key) {
    if (redisDisabled || !redisClient || !redisClient.isOpen) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache get error:", error.message);
      return null;
    }
  },

  // Delete cache
  async del(key) {
    if (redisDisabled || !redisClient || !redisClient.isOpen) return;
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error("Cache delete error:", error.message);
    }
  },

  // Delete cache by pattern
  async delPattern(pattern) {
    if (redisDisabled || !redisClient || !redisClient.isOpen) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error("Cache pattern delete error:", error.message);
    }
  },

  // Invalidate related caches
  async invalidateTags(tags) {
    if (redisDisabled || !redisClient || !redisClient.isOpen) return;
    for (const tag of tags) {
      await this.delPattern(`*${tag}*`);
    }
  },
};

module.exports = { connectRedis, redisClient, cache };
