/**
 * Text Tagging Utility
 *
 * Uses LLM to analyze post content and generate relevant tags.
 * Supports Ollama and OpenAI-compatible APIs.
 */

const path = require("path");

// Configuration from environment
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:1234";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const TEXT_LLM_MODEL_ID = process.env.TEXT_LLM_MODEL_ID || "llama3.2";
const LLM_TIMEOUT = parseInt(process.env.LLM_TIMEOUT) || 30000;
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";

/**
 * Determine the protocol (http/https)
 */
const getProtocol = (url) => {
  return url.startsWith("https") ? require("https") : require("http");
};

/**
 * Make HTTP request to LLM API
 */
const makeRequest = async (endpoint, method = "POST", data = null) => {
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
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

/**
 * Parse tags from LLM response
 */
const parseTagsFromResponse = (response, maxTags) => {
  const tags = [];

  try {
    // Try to parse as JSON array
    const arrayMatch = response.match(/\[.*\]/s);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, maxTags).map((tag) => {
            if (typeof tag === "string") {
              return tag.trim().toLowerCase();
            }
            return tag.tag || tag.name || String(tag).trim().toLowerCase();
          });
        }
      } catch (e) {
        // Continue to next parsing method
      }
    }

    // Fallback: extract quoted strings
    const matches = response.match(/"([^"]+)"/g);
    if (matches) {
      return matches
        .slice(0, maxTags)
        .map((m) => m.replace(/"/g, "").trim().toLowerCase());
    }

    // Last fallback: extract words
    const words = response.split(/[\s,\n]+/).filter((w) => w.length > 2);
    return [...new Set(words)].slice(0, maxTags);
  } catch (error) {
    console.error("[TextTagging] Error parsing tags:", error);
  }

  return tags;
};

/**
 * Generate tags from text content using LLM
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @param {Object} options - Tagging options
 * @returns {Promise<Array>} - Array of tag objects
 */
const generateTagsFromText = async (title, content, options = {}) => {
  const { maxTags = 10, minConfidence = 0.5 } = options;

  const startTime = Date.now();

  try {
    const textPrompt = `You are an expert at analyzing aquarium and fish-keeping forum posts. 
Analyze the following post and extract up to ${maxTags} relevant tags.

Return ONLY a JSON array of tag strings. Each tag should be:
- A single word or common phrase (e.g., "betta", "planted-tank", "ich")
- Relevant to aquarium keeping, fish species, equipment, plants, diseases, or topics
- Lowercase

Title: ${title}

Content: ${content}

Examples of good tags: freshwater, neon-tetra, planted, filtration, ich, breeding, community-tank, etc.

Return ONLY the JSON array, nothing else.`;

    let response;

    if (LLM_PROVIDER === "ollama") {
      // Ollama-style request
      const payload = {
        model: TEXT_LLM_MODEL_ID,
        prompt: textPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 200,
        },
      };
      response = await makeRequest("/api/generate", "POST", payload);
      response = { response: response.response };
    } else {
      // OpenAI-compatible request
      const payload = {
        model: TEXT_LLM_MODEL_ID,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at identifying relevant tags for aquarium forum posts. Return ONLY a JSON array of tag strings.",
          },
          {
            role: "user",
            content: textPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      };
      response = await makeRequest("/v1/chat/completions", "POST", payload);

      // Extract content from OpenAI-style response
      const content = response.choices?.[0]?.message?.content || "";
      response = { response: content };
    }

    // Parse tags from response
    const rawResponse = response.response;
    const tagNames = parseTagsFromResponse(rawResponse, maxTags);

    // Filter and format tags
    const tags = tagNames
      .filter((tag) => tag.length > 1 && tag.length <= 50)
      .map((tag) => ({
        tag,
        confidence: 0.85, // Default confidence for text-based tags
        autoGenerated: true,
        source: "text-llm",
      }));

    const processingTime = Date.now() - startTime;
    console.log(
      `[TextTagging] Generated ${tags.length} tags in ${processingTime}ms`,
    );

    return tags;
  } catch (error) {
    console.error("[TextTagging] Error:", error.message);
    return [];
  }
};

/**
 * Check if text LLM is available
 */
const checkAvailability = async () => {
  try {
    await makeRequest(
      LLM_PROVIDER === "ollama" ? "/api/tags" : "/v1/models",
      "GET",
      null,
      1,
    );
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Health check for text LLM service
 */
const healthCheck = async () => {
  try {
    const isAvailable = await checkAvailability();
    return {
      healthy: isAvailable,
      model: TEXT_LLM_MODEL_ID,
      provider: LLM_PROVIDER,
      baseUrl: LLM_BASE_URL,
    };
  } catch (error) {
    return {
      healthy: false,
      model: TEXT_LLM_MODEL_ID,
      error: error.message,
    };
  }
};

module.exports = {
  generateTagsFromText,
  checkAvailability,
  healthCheck,
  parseTagsFromResponse,
  TEXT_LLM_MODEL_ID,
  LLM_PROVIDER,
};
