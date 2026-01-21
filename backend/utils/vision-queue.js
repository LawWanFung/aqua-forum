/**
 * Vision Queue
 *
 * Bull queue for processing images through vision LLM asynchronously
 */

const Queue = require("bull");
const path = require("path");
const fs = require("fs");
const visionService = require("./vision-service");
const Photo = require("../models/Photo");
const Tag = require("../models/Tag");

// Queue configuration
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_DB = parseInt(process.env.REDIS_DB) || 0;

const QUEUE_CONCURRENCY = parseInt(process.env.VISION_QUEUE_CONCURRENCY) || 2;
const QUEUE_RETRY_ATTEMPTS = parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3;
const QUEUE_RETRY_DELAY = parseInt(process.env.QUEUE_RETRY_DELAY) || 5000;
const JOB_TIMEOUT = parseInt(process.env.VISION_JOB_TIMEOUT) || 120000;

// Redis configuration
const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  db: REDIS_DB,
};

if (REDIS_PASSWORD) {
  redisConfig.password = REDIS_PASSWORD;
}

// Create the queue
const visionQueue = new Queue("vision-processing", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: QUEUE_RETRY_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: QUEUE_RETRY_DELAY,
    },
    timeout: JOB_TIMEOUT,
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

/**
 * Process a vision tagging job
 */
visionQueue.process(QUEUE_CONCURRENCY, async (job) => {
  const { photoId, imagePath, imageUrl, userId } = job.data;

  console.log(`[VisionQueue] Processing photo ${photoId}`);

  try {
    // Update photo status to processing
    await Photo.findByIdAndUpdate(photoId, {
      "metadata.visionStatus": "processing",
      "metadata.visionStartedAt": new Date(),
    });

    // Check if image file exists, if not download from URL
    let filePath = imagePath;
    if (!filePath || !fs.existsSync(filePath)) {
      // Download image from URL to temp file
      filePath = await downloadImageToTemp(imageUrl, photoId);
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("Image file not available");
    }

    // Generate tags using vision LLM
    const result = await visionService.generateTags(filePath, {
      maxTags: 15,
      minConfidence: 0.5,
    });

    if (result.success && result.tags.length > 0) {
      // Extract tag names
      const tagNames = result.tags.map((t) => t.tag);

      // Update photo with vision tags
      await Photo.findByIdAndUpdate(photoId, {
        $addToSet: { tags: { $each: tagNames } },
        "metadata.visionStatus": "completed",
        "metadata.visionCompletedAt": new Date(),
        "metadata.visionTags": result.tags,
        "metadata.visionModel": result.metadata.model,
        "metadata.visionProcessingTime": result.metadata.processingTime,
      });

      // Update tag usage counts
      const uniqueTags = [...new Set(tagNames.map((t) => t.toLowerCase()))];
      await Promise.all(
        uniqueTags.map(async (tagName) => {
          await Tag.findOneAndUpdate(
            { name: tagName },
            { $inc: { usageCount: 1 } },
            { upsert: true, new: true },
          );
        }),
      );

      console.log(
        `[VisionQueue] Photo ${photoId} tagged with ${result.tags.length} tags`,
      );
    } else {
      // No tags generated, mark as completed with warning
      await Photo.findByIdAndUpdate(photoId, {
        "metadata.visionStatus": "completed",
        "metadata.visionCompletedAt": new Date(),
        "metadata.visionError": result.error || "No tags generated",
      });
    }

    // Clean up temp file if downloaded
    if (filePath && filePath.startsWith("/tmp")) {
      fs.unlinkSync(filePath);
    }

    return { success: true, photoId, tagsCount: result.tags.length };
  } catch (error) {
    console.error(`[VisionQueue] Error processing photo ${photoId}:`, error);

    // Update photo status to failed
    await Photo.findByIdAndUpdate(photoId, {
      "metadata.visionStatus": "failed",
      "metadata.visionCompletedAt": new Date(),
      "metadata.visionError": error.message,
    });

    throw error; // Re-throw to trigger retry
  }
});

/**
 * Download image from URL to temp file
 */
const downloadImageToTemp = async (imageUrl, photoId) => {
  const https = require("https");
  const http = require("http");

  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith("https") ? https : http;
    const tempPath = path.join("/tmp", `vision-${photoId}-${Date.now()}.jpg`);

    const file = fs.createWriteStream(tempPath);

    protocol
      .get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          fs.unlinkSync(tempPath);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        res.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(tempPath);
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(tempPath);
        reject(err);
      });
  });
};

/**
 * Add a photo to the vision processing queue
 * @param {string} photoId - Photo document ID
 * @param {string} imagePath - Local path to image file (optional)
 * @param {string} imageUrl - URL of the image (required if imagePath not provided)
 * @param {string} userId - User ID for tracking
 * @param {Object} options - Job options
 */
const queueVisionProcessing = async (
  photoId,
  imagePath,
  imageUrl,
  userId,
  options = {},
) => {
  const job = {
    photoId,
    imagePath,
    imageUrl,
    userId,
    priority: options.priority || "normal",
    delay: options.delay || 0,
  };

  // Add to queue
  const addedJob = await visionQueue.add(job, {
    priority: options.priority === "high" ? 1 : 10,
    delay: options.delay || 0,
    jobId: `vision-${photoId}`,
  });

  console.log(`[VisionQueue] Added photo ${photoId} to queue`);

  return addedJob;
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    visionQueue.getWaitingCount(),
    visionQueue.getActiveCount(),
    visionQueue.getCompletedCount(),
    visionQueue.getFailedCount(),
    visionQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Clean up old jobs
 */
const cleanup = async () => {
  await visionQueue.clean(24 * 60 * 60 * 1000, "completed"); // Clean completed older than 24h
  await visionQueue.clean(7 * 24 * 60 * 60 * 1000, "failed"); // Clean failed older than 7d
  console.log("[VisionQueue] Cleanup completed");
};

// Event listeners
visionQueue.on("completed", (job, result) => {
  console.log(`[VisionQueue] Job ${job.id} completed:`, result);
});

visionQueue.on("failed", (job, error) => {
  console.error(`[VisionQueue] Job ${job.id} failed:`, error.message);
});

visionQueue.on("error", (error) => {
  console.error("[VisionQueue] Queue error:", error);
});

module.exports = {
  visionQueue,
  queueVisionProcessing,
  getQueueStats,
  cleanup,
};
