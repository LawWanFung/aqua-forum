/**
 * Abstract Media Service Interface
 *
 * This module provides a unified interface for different media service providers.
 * Supported providers: cloudinary, shortpixel, local
 */

const path = require("path");
const fs = require("fs");

// Provider implementations
const cloudinaryProvider = require("./cloudinary");
const shortpixelProvider = require("./shortpixel");

/**
 * Get the appropriate media provider based on configuration
 */
const getProvider = () => {
  const provider = process.env.MEDIA_SERVICE_PROVIDER || "local";

  switch (provider) {
    case "cloudinary":
      return cloudinaryProvider;
    case "shortpixel":
      return shortpixelProvider;
    case "local":
      return localProvider;
    default:
      console.warn(`Unknown media provider: ${provider}, using cloudinary`);
      return cloudinaryProvider;
  }
};

/**
 * Local storage provider implementation
 */
const localProvider = {
  /**
   * Upload an image to local storage
   * @param {string} filePath - Path to the local file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result with URLs
   */
  async upload(filePath, options = {}) {
    const { filename, userId } = options;

    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const targetDir = path.join(
      __dirname,
      "..",
      uploadDir,
      "images",
      userId || "common",
    );

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(filePath);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const targetPath = path.join(targetDir, uniqueName);

    // Copy file to target location
    fs.copyFileSync(filePath, targetPath);

    // Generate URLs
    const baseUrl = `/uploads/images/${userId || "common"}`;
    const imageUrl = `${baseUrl}/${uniqueName}`;

    return {
      success: true,
      url: imageUrl,
      thumbnailUrl: imageUrl,
      originalUrl: imageUrl,
      provider: "local",
      metadata: {
        filename: uniqueName,
        size: fs.statSync(targetPath).size,
      },
    };
  },

  /**
   * Delete an image from local storage
   * @param {string} imageUrl - URL or path to the image
   * @returns {Promise<Object>} - Deletion result
   */
  async delete(imageUrl) {
    try {
      // Convert URL to file path
      const relativePath = imageUrl.replace(/^\/uploads/, "uploads");
      const filePath = path.join(__dirname, "..", relativePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, deleted: true };
      }

      return { success: true, deleted: false, message: "File not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Generate image variants (thumbnails, etc.)
   * @param {string} imageUrl - Original image URL
   * @returns {Object} - Object with different size URLs
   */
  getImageVariants(imageUrl) {
    // For local storage, return the original URL for all variants
    // In production, you'd want to generate actual thumbnails
    return {
      original: imageUrl,
      thumbnail: imageUrl,
      medium: imageUrl,
      large: imageUrl,
    };
  },

  /**
   * Not supported for local provider
   */
  async getAITags() {
    return [];
  },
};

/**
 * Unified Media Service Interface
 */
class MediaService {
  constructor() {
    this.provider = getProvider();
  }

  /**
   * Upload an image
   * @param {string} filePath - Path to the local file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async upload(filePath, options = {}) {
    return this.provider.upload(filePath, options);
  }

  /**
   * Delete an image
   * @param {string} imageUrl - URL of the image to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async delete(imageUrl) {
    return this.provider.delete(imageUrl);
  }

  /**
   * Generate image variants
   * @param {string} imageUrl - Original image URL
   * @returns {Object} - Object with variant URLs
   */
  getImageVariants(imageUrl) {
    return this.provider.getImageVariants(imageUrl);
  }

  /**
   * Get AI-generated tags for an image
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<Array>} - Array of tags with confidence scores
   */
  async getAITags(imageUrl) {
    // If using local provider, return empty array (LLM tags handled separately)
    if (this.provider === localProvider) {
      return [];
    }
    return this.provider.getAITags(imageUrl);
  }

  /**
   * Resize an image
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path for output image
   * @param {number} maxLongSide - Maximum length of the longer side
   * @param {number} quality - JPEG quality (1-100)
   * @returns {Promise<Object>} - Resize result
   */
  async resizeImage(inputPath, outputPath, maxLongSide = 1024, quality = 85) {
    const sharp = require("sharp");

    try {
      const metadata = await sharp(inputPath).metadata();
      let resizeOptions = { fit: "inside", withoutEnlargement: true };

      if (maxLongSide > 0) {
        if (metadata.width > metadata.height) {
          resizeOptions.width = maxLongSide;
        } else {
          resizeOptions.height = maxLongSide;
        }
      }

      await sharp(inputPath)
        .resize(resizeOptions)
        .jpeg({ quality, progressive: true })
        .toFile(outputPath);

      return {
        success: true,
        inputPath,
        outputPath,
        metadata: await sharp(outputPath).metadata(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance and class
module.exports = {
  MediaService,
  mediaService: new MediaService(),
  localProvider,
  getProvider,
};
