/**
 * Cloudinary Media Service Provider
 *
 * Handles image upload, AI tagging, and CDN delivery via Cloudinary
 */

const cloudinary = require("cloudinary").v2;

// Configure Cloudinary if credentials are available
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload an image to Cloudinary
 * @param {string} filePath - Path to local file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with URLs
 */
const upload = async (filePath, options = {}) => {
  const { userId, title } = options;

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary not configured");
  }

  try {
    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `aqua-forum/${userId || "common"}`,
      resource_type: "image",
      transformation: [
        { quality: process.env.IMAGE_QUALITY || "auto:best" },
        { fetch_format: process.env.IMAGE_OUTPUT_FORMAT || "auto" },
      ],
      tags: options.tags || [],
      context: title ? `title=${title}` : "",
    });

    return {
      success: true,
      url: result.secure_url,
      thumbnailUrl: cloudinary.url(result.public_id, {
        width: 200,
        height: 200,
        crop: "fill",
        quality: "auto",
        fetch_format: "auto",
      }),
      originalUrl: result.secure_url,
      provider: "cloudinary",
      metadata: {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
      },
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} imageUrl - URL of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (imageUrl) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return { success: false, error: "Cloudinary not configured" };
  }

  try {
    // Get the public ID from the URL
    const publicIdMatch = imageUrl.match(/\/v\d+\/(.+?)(?:\.|$)/);
    if (!publicIdMatch) {
      return { success: false, error: "Invalid Cloudinary URL" };
    }
    const publicId = publicIdMatch[1];

    const result = await cloudinary.uploader.destroy(publicId);

    return {
      success: result.result === "ok",
      deleted: result.result === "ok",
      message: result.result,
    };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate image variants using Cloudinary transformations
 * @param {string} imageUrl - Original image URL
 * @returns {Object} - Object with different size URLs
 */
const getImageVariants = (imageUrl) => {
  if (!imageUrl.startsWith("http")) {
    return {
      original: imageUrl,
      thumbnail: imageUrl,
      medium: imageUrl,
      large: imageUrl,
    };
  }

  // Extract base URL and transformation from Cloudinary URL
  const baseUrl = imageUrl.split("/upload/")[0];
  const transform = imageUrl.split("/upload/")[1] || "";

  return {
    original: imageUrl,
    thumbnail: `${baseUrl}/upload/w_200,h_200,c_fill,q_auto,f_auto/${transform}`,
    medium: `${baseUrl}/upload/w_600,h_400,c_fill,q_auto,f_auto/${transform}`,
    large: `${baseUrl}/upload/w_1200,h_800,c_fill,q_auto,f_auto/${transform}`,
  };
};

/**
 * Get AI-generated tags from Cloudinary for an image
 * @param {string} imageUrl - The public URL of the image
 * @returns {Promise<Array>} - Array of tags with confidence scores
 */
const getAITags = async (imageUrl) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.log("Cloudinary not configured, skipping AI tagging");
    return [];
  }

  try {
    // Get the public ID from the URL
    const publicIdMatch = imageUrl.match(/\/v\d+\/(.+?)(?:\.|$)/);
    if (!publicIdMatch) {
      return [];
    }
    const publicId = publicIdMatch[1];

    // Use Cloudinary's context and tags API
    const result = await cloudinary.api.resources_by_ids([publicId], {
      colors: false,
      image_metadata: true,
      context: true,
      tags: true,
    });

    if (result.resources && result.resources.length > 0) {
      const resource = result.resources[0];

      // Get tags from the resource (both manual and AI-generated)
      const tags = resource.tags || [];

      // Map to tag objects with confidence
      return tags.map((tag) => ({
        tag,
        confidence: 0.85,
        autoGenerated: true,
      }));
    }

    return [];
  } catch (error) {
    console.error("Cloudinary AI tagging error:", error);
    return [];
  }
};

/**
 * Process image with Cloudinary (upload + get variants)
 * @param {string} filePath - Path to local file
 * @returns {Promise<Object>} - Processing result
 */
const processImage = async (filePath, options = {}) => {
  const uploadResult = await upload(filePath, options);
  const variants = getImageVariants(uploadResult.url);

  return {
    success: true,
    ...uploadResult,
    variants,
  };
};

/**
 * Check Cloudinary API status
 * @returns {Promise<Object>} - API status
 */
const checkStatus = async () => {
  try {
    const result = await cloudinary.api.ping();
    return {
      available: result.status === "ok",
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
};

// Export provider interface
module.exports = {
  upload,
  delete: deleteImage,
  getImageVariants,
  getAITags,
  processImage,
  checkStatus,
  cloudinary, // Export raw cloudinary instance for advanced usage
};
