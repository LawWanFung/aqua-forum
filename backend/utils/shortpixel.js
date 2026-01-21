/**
 * ShortPixel Media Service Provider
 *
 * Handles image upload, optimization, and CDN delivery via ShortPixel
 * Documentation: https://shortpixel.com/docs/
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ShortPixel API configuration
const SHORTPIXEL_API_KEY = process.env.SHORTPIXEL_API_KEY;
const SHORTPIXEL_API_URL =
  process.env.SHORTPIXEL_API_URL || "https://api.shortpixel.com/v2";
const SHORTPIXEL_RETRY_COUNT =
  parseInt(process.env.SHORTPIXEL_RETRY_COUNT) || 3;
const SHORTPIXEL_TIMEOUT = parseInt(process.env.SHORTPIXEL_TIMEOUT) || 30000;

/**
 * Make HTTP request to ShortPixel API
 */
const makeRequest = (
  endpoint,
  method = "POST",
  data = null,
  retries = SHORTPIXEL_RETRY_COUNT,
) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SHORTPIXEL_API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: SHORTPIXEL_TIMEOUT,
    };

    if (process.env.SHORTPIXEL_API_SECRET) {
      options.headers["Authorization"] =
        `Bearer ${process.env.SHORTPIXEL_API_KEY}:${process.env.SHORTPIXEL_API_SECRET}`;
    }

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      if (retries > 0) {
        setTimeout(() => {
          makeRequest(endpoint, method, data, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      } else {
        reject(error);
      }
    });

    req.on("timeout", () => {
      req.destroy();
      if (retries > 0) {
        setTimeout(() => {
          makeRequest(endpoint, method, data, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      } else {
        reject(new Error("Request timeout"));
      }
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

/**
 * Upload image to ShortPixel
 * @param {string} filePath - Path to local file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
const upload = async (filePath, options = {}) => {
  const { userId, title } = options;

  if (!SHORTPIXEL_API_KEY) {
    throw new Error("ShortPixel API key not configured");
  }

  try {
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    // Call ShortPixel Optimize endpoint
    const result = await makeRequest("/optimize", "POST", {
      apikey: SHORTPIXEL_API_KEY,
      image_base64: base64Data,
      lossless: false,
      keep_exif: true,
      convert_to: ["webp", "avif"],
      resize: {
        width: parseInt(process.env.IMAGE_MAX_LONG_SIDE) || 1024,
        height: parseInt(process.env.IMAGE_MAX_LONG_SIDE) || 1024,
        strategy: "fit",
      },
      wait: true, // Wait for processing to complete
    });

    if (result && result.success) {
      // Generate unique URL path
      const uniqueId =
        Date.now().toString(36) + Math.random().toString(36).substr(2);
      const ext = path.extname(filePath).replace(".", "") || "jpg";

      // ShortPixel provides optimized URLs
      const baseUrl = result.data?.cdn_url || `https://cdn.shortpixel.ai`;

      return {
        success: true,
        url: `${baseUrl}/${uniqueId}.${ext}`,
        thumbnailUrl: `${baseUrl}/${uniqueId}_thumb.${ext}`,
        originalUrl: `${baseUrl}/${uniqueId}_original.${ext}`,
        webpUrl: `${baseUrl}/${uniqueId}.webp`,
        avifUrl: `${baseUrl}/${uniqueId}.avif`,
        provider: "shortpixel",
        metadata: {
          originalSize: fileBuffer.length,
          optimizedSize: result.data?.optimized_size || 0,
          compressionRatio: result.data?.compression || 0,
        },
      };
    }

    throw new Error(result.message || "Upload failed");
  } catch (error) {
    console.error("ShortPixel upload error:", error);
    throw error;
  }
};

/**
 * Delete image from ShortPixel
 * Note: ShortPixel is primarily an optimization service, not a storage service
 * This operation may not be supported
 * @param {string} imageUrl - URL of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (imageUrl) => {
  // ShortPixel doesn't provide a delete API for optimized images
  // Images are typically stored on the user's own storage
  // This is a placeholder for future implementation
  console.warn(
    "ShortPixel delete not implemented - images are managed externally",
  );
  return { success: true, message: "Delete not supported for ShortPixel CDN" };
};

/**
 * Generate image variants using ShortPixel URL parameters
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

  // ShortPixel URL transformation parameters
  // Format: https://cdn.shortpixel.ai/{key}/{width},{height},cfit/{format}/{quality}/{image}

  const baseMatch = imageUrl.match(
    /^(https:\/\/cdn\.shortpixel\.ai\/[^/]+\/)(.+)$/,
  );

  if (baseMatch) {
    const [_, base, filename] = baseMatch;

    return {
      original: imageUrl,
      thumbnail: `${base}w_200,h_200,c_fill,q_auto,f_auto/${filename}`,
      medium: `${base}w_600,h_400,c_fill,q_auto,f_auto/${filename}`,
      large: `${base}w_1200,h_800,c_fill,q_auto,f_auto/${filename}`,
    };
  }

  // If not a ShortPixel URL, return as-is
  return {
    original: imageUrl,
    thumbnail: imageUrl,
    medium: imageUrl,
    large: imageUrl,
  };
};

/**
 * Get AI-generated tags from ShortPixel
 * Note: ShortPixel doesn't provide AI tagging, return empty array
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<Array>} - Empty array
 */
const getAITags = async (imageUrl) => {
  console.log("ShortPixel does not provide AI tagging, use vision LLM instead");
  return [];
};

/**
 * Process image with ShortPixel for optimization
 * @param {string} filePath - Path to local file
 * @returns {Promise<Object>} - Processing result
 */
const processImage = async (filePath) => {
  const result = await upload(filePath);

  return {
    success: true,
    optimizedUrl: result.url,
    webpUrl: result.webpUrl,
    avifUrl: result.avifUrl,
    metadata: result.metadata,
  };
};

/**
 * Check ShortPixel API status
 * @returns {Promise<Object>} - API status
 */
const checkStatus = async () => {
  try {
    const result = await makeRequest("/status", "GET");
    return {
      available: true,
      credits: result.credits_remaining,
      plan: result.plan_type,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
};

module.exports = {
  upload,
  delete: deleteImage,
  getImageVariants,
  getAITags,
  processImage,
  checkStatus,
};
