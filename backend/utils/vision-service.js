/**
 * Vision LLM Service
 *
 * Handles communication with vision LLM models (e.g., LLaVA, GPT-4V)
 * for automatic image tagging. Supports Ollama and OpenAI-compatible APIs.
 */

const fs = require("fs");
const path = require("path");

// Configuration
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:1234";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL_ID = process.env.LLM_MODEL_ID || "llava-1.5-7b-4096";
const LLM_TIMEOUT = parseInt(process.env.LLM_TIMEOUT) || 60000;
const LLM_MAX_RETRIES = parseInt(process.env.LLM_MAX_RETRIES) || 3;
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai"; // 'ollama' or 'openai'

/**
 * Determine the protocol (http/https)
 */
const getProtocol = (url) => {
  return url.startsWith("https") ? require("https") : require("http");
};

/**
 * Make HTTP request to LLM API
 */
const makeRequest = async (
  endpoint,
  method = "POST",
  data = null,
  retries = LLM_MAX_RETRIES,
) => {
  const protocol = getProtocol(LLM_BASE_URL);

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, LLM_BASE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 1234),
      path: url.pathname,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(LLM_API_KEY && { Authorization: `Bearer ${LLM_API_KEY}` }),
      },
      timeout: LLM_TIMEOUT,
    };

    const req = protocol.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      if (retries > 0) {
        setTimeout(
          async () => {
            try {
              const result = await makeRequest(
                endpoint,
                method,
                data,
                retries - 1,
              );
              resolve(result);
            } catch (err) {
              reject(err);
            }
          },
          1000 * (LLM_MAX_RETRIES - retries + 1),
        );
      } else {
        reject(error);
      }
    });

    req.on("timeout", () => {
      req.destroy();
      if (retries > 0) {
        setTimeout(
          async () => {
            try {
              const result = await makeRequest(
                endpoint,
                method,
                data,
                retries - 1,
              );
              resolve(result);
            } catch (err) {
              reject(err);
            }
          },
          1000 * (LLM_MAX_RETRIES - retries + 1),
        );
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
 * Convert image to base64
 */
const imageToBase64 = (imagePath) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    throw new Error(`Failed to read image: ${error.message}`);
  }
};

/**
 * Build Ollama-style request payload
 */
const buildOllamaPayload = (imagePath, maxTags) => {
  const base64Image = imageToBase64(imagePath);

  return {
    model: LLM_MODEL_ID,
    prompt: `Analyze this aquarium-related image and provide relevant tags as JSON. 
Focus on: fish species, plant types, aquarium type (freshwater/saltwater), decorations, water conditions, etc.
Max ${maxTags} tags. Return ONLY JSON.`,
    images: [base64Image],
    stream: false,
    options: {
      temperature: 0.2,
      num_predict: 200,
    },
  };
};

/**
 * Build OpenAI-compatible request payload (for LM Studio, etc.)
 */
const buildOpenAIPayload = (imagePath, maxTags) => {
  const base64Image = imageToBase64(imagePath);

  // Determine the image format for data URL
  let mimeType = "image/jpeg";
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".png") mimeType = "image/png";
  else if (ext === ".webp") mimeType = "image/webp";
  else if (ext === ".gif") mimeType = "image/gif";

  return {
    model: LLM_MODEL_ID,
    messages: [
      {
        role: "system",
        content: `You are an expert at identifying aquarium fish, plants, and aquatic environments. 
Analyze the image and provide relevant tags. Return ONLY a JSON array of tags with confidence scores.
Format: {"tags": [{"tag": "name", "confidence": 0.95}]}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this aquarium image and provide up to ${maxTags} relevant tags as JSON. 
Include fish species, plant types, aquarium type, decorations, etc.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
  };
};

/**
 * Generate tags for an image using vision LLM
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - Tagging options
 * @returns {Promise<Object>} - Tagging result with tags and metadata
 */
const generateTags = async (imagePath, options = {}) => {
  const { maxTags = 10, minConfidence = 0.5 } = options;

  const startTime = Date.now();

  try {
    // Check if LLM is available
    const isAvailable = await checkAvailability();
    if (!isAvailable) {
      throw new Error("Vision LLM not available");
    }

    // Build payload based on provider type
    let response;
    if (LLM_PROVIDER === "ollama") {
      const payload = buildOllamaPayload(imagePath, maxTags);
      response = await makeRequest("/api/generate", "POST", payload);
      response = { response: response.response };
    } else {
      // OpenAI-compatible (LM Studio, etc.)
      const payload = buildOpenAIPayload(imagePath, maxTags);
      response = await makeRequest("/v1/chat/completions", "POST", payload);

      // Extract content from OpenAI-style response
      const content = response.choices?.[0]?.message?.content || "";
      response = { response: content };
    }

    // Parse the response to extract tags
    const rawResponse = response.response;
    const tags = parseTagsFromResponse(rawResponse, maxTags, minConfidence);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      tags,
      metadata: {
        model: LLM_MODEL_ID,
        provider: LLM_PROVIDER,
        processingTime,
        tagsCount: tags.length,
        maxTags,
        imagePath: path.basename(imagePath),
      },
    };
  } catch (error) {
    console.error("Vision LLM tagging error:", error);
    return {
      success: false,
      error: error.message,
      tags: [],
      metadata: {
        model: LLM_MODEL_ID,
        provider: LLM_PROVIDER,
        processingTime: Date.now() - startTime,
        error: error.message,
      },
    };
  }
};

/**
 * Parse tags from LLM response
 */
const parseTagsFromResponse = (response, maxTags, minConfidence) => {
  const tags = [];

  try {
    // Try to parse as JSON first
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tags && Array.isArray(parsed.tags)) {
          return parsed.tags
            .filter((t) => t.confidence >= minConfidence)
            .slice(0, maxTags);
        }
      } catch (e) {
        // Continue parsing
      }
    }

    // Try to parse as array
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((t) => t.confidence >= minConfidence)
            .slice(0, maxTags);
        }
      } catch (e) {
        // Not a valid array, continue to text parsing
      }
    }

    // Fallback: parse from text
    const tagMatches =
      response.match(/"([^"]+)"/g) || response.match(/(\w+(?:\s+\w+){0,2})/g);
    if (tagMatches) {
      const seen = new Set();
      tagMatches.slice(0, maxTags).forEach((match) => {
        const tag = match.replace(/"/g, "").toLowerCase().trim();
        if (tag.length > 1 && !seen.has(tag) && !tag.includes("confidence")) {
          seen.add(tag);
          tags.push({ tag, confidence: 0.8 });
        }
      });
    }
  } catch (error) {
    console.error("Error parsing tags:", error);
  }

  return tags;
};

/**
 * Check if vision LLM is available
 */
const checkAvailability = async () => {
  try {
    if (LLM_PROVIDER === "ollama") {
      // Ollama-style check
      const response = await makeRequest("/api/tags", "GET", null, 1);
      return (
        response.models?.some((m) =>
          m.name.includes(LLM_MODEL_ID.split(":")[0]),
        ) || false
      );
    } else {
      // OpenAI-compatible check (LM Studio)
      const response = await makeRequest("/v1/models", "GET", null, 1);
      return (
        response.data?.some(
          (m) =>
            m.id.includes(LLM_MODEL_ID.split(":")[0]) || m.id === LLM_MODEL_ID,
        ) || false
      );
    }
  } catch (error) {
    // Try a simple connectivity check
    try {
      await makeRequest("/v1/models", "GET", null, 1);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * Check LLM health status
 */
const healthCheck = async () => {
  try {
    const isAvailable = await checkAvailability();

    if (isAvailable) {
      return {
        healthy: true,
        model: LLM_MODEL_ID,
        provider: LLM_PROVIDER,
        baseUrl: LLM_BASE_URL,
      };
    }

    return {
      healthy: false,
      model: LLM_MODEL_ID,
      provider: LLM_PROVIDER,
      error: "Model not available",
    };
  } catch (error) {
    return {
      healthy: false,
      model: LLM_MODEL_ID,
      provider: LLM_PROVIDER,
      error: error.message,
    };
  }
};

/**
 * Generate tags for multiple images in batch
 * @param {Array<string>} imagePaths - Array of image paths
 * @param {Object} options - Tagging options
 * @returns {Promise<Array>} - Array of tagging results
 */
const batchGenerateTags = async (imagePaths, options = {}) => {
  const results = await Promise.all(
    imagePaths.map(async (imagePath) => {
      const result = await generateTags(imagePath, options);
      return {
        imagePath,
        ...result,
      };
    }),
  );

  return results;
};

module.exports = {
  generateTags,
  batchGenerateTags,
  checkAvailability,
  healthCheck,
  imageToBase64,
  LLM_PROVIDER,
  LLM_MODEL_ID,
  LLM_BASE_URL,
};
