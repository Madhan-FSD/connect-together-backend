import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust utility to call the Gemini API with exponential backoff for retries.
 */
async function _callGeminiAPI(promptText, config = {}) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY missing");
    return null;
  }

  const MAX_RETRIES = 3;
  const timeout = config.requestTimeout || 60000;

  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: config.temperature ?? 0.8,
      topK: config.topK ?? 40,
      topP: config.topP ?? 0.95,

      maxOutputTokens: config.maxOutputTokens ?? 4096,

      ...(config.responseMimeType && {
        responseMimeType: config.responseMimeType,
      }),
    },
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(GEMINI_URL, body, {
        headers: { "Content-Type": "application/json" },
        timeout: timeout,
      });

      const aiText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        response.data?.candidates?.[0]?.output ??
        "";

      const finishReason = response.data?.candidates?.[0]?.finishReason;
      if (!aiText && finishReason === "MAX_TOKENS") {
        throw new Error("AI response was cut short due to token limit.");
      }

      if (!aiText || aiText.trim().length === 0) {
        if (attempt < MAX_RETRIES) {
          console.warn(
            `Attempt ${attempt}: Empty AI response received. Retrying in 1s...`
          );
          await delay(1000);
          continue;
        }
        console.error(
          "Gemini returned empty text:",
          JSON.stringify(response.data, null, 2)
        );
        throw new Error("AI response was empty or malformed.");
      }

      return aiText;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;

      if (
        attempt < MAX_RETRIES &&
        (err.response?.status === 429 || msg.includes("timeout"))
      ) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.warn(
          `Attempt ${attempt} failed (${msg}). Retrying in ${
            backoffTime / 1000
          }ms...`
        );
        await delay(backoffTime);
        continue;
      }

      console.error("Gemini API Error:", msg);
      throw new Error(`Failed to process AI response: ${msg}`);
    }
  }

  throw new Error("Failed to call Gemini API after multiple attempts.");
}

export async function generateAIInsight(childName, activities) {
  const prompt = `
You are a friendly tutor assistant for parents. Generate a short (2–3 sentence)
summary for the child ${childName} based on the following activity log.
Focus on improvement, engagement, and one simple actionable suggestion.

Child: ${childName}
Recent Activities: ${JSON.stringify(activities, null, 2)}
`;

  try {
    const result = await _callGeminiAPI(prompt);
    if (!result) return "AI Summary Error: API key not configured.";
    return result.trim();
  } catch (error) {
    console.error(
      `Error in generateAIInsight for ${childName}:`,
      error.message
    );
    return "AI Summary Error: Failed to generate insight.";
  }
}

export async function generateFeaturedContent(userPosts, suggestionCount = 4) {
  if (!userPosts || userPosts.length === 0) {
    return {
      introHeadline: "No content available to feature.",
      items: [],
    };
  }

  const postData = userPosts.map((post) => ({
    title: post.title,
    content: post.content?.slice(0, 120) || "",
    likes: post.likesCount,
  }));

  const prompt = `
// You are an editor for a creative youth magazine.
// Analyze the following user posts and suggest **exactly ${suggestionCount} original**
// magazine or news-style article ideas inspired by their themes and creativity.

// Each suggestion MUST include:
// - "headline": a catchy title (max 12 words)
// - "summary": a 1–2 sentence creative description
// - "category": theme or topic (e.g., Art, Gaming, Science)
// Also include a short "introHeadline" (max 15 words) that introduces the entire section.

Input Posts:
${JSON.stringify(postData, null, 2)}

Output ONLY valid JSON conforming to the schema:
{
  "introHeadline": "Exciting intro headline",
  "items": [
    { "headline": "Headline 1", "summary": "Short summary", "category": "Topic" }
  ]
}
`;

  try {
    const aiText = await _callGeminiAPI(prompt, {
      requestTimeout: 60000,
      responseMimeType: "application/json",
    });

    const cleaned = aiText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error(
        "JSON.parse failed on AI response. Raw AI Text:",
        cleaned,
        "Error:",
        e.message
      );
      throw new Error(
        "AI returned unparsable JSON structure, likely model malfunction."
      );
    }

    if (!parsed || !parsed.items || !Array.isArray(parsed.items)) {
      console.error(
        "AI returned valid JSON but missing or malformed 'items' array:",
        JSON.stringify(parsed, null, 2)
      );
      return {
        introHeadline: "Your personalized creative feed!",
        items: [],
      };
    }

    return {
      introHeadline: parsed.introHeadline,
      items: parsed.items,
    };
  } catch (err) {
    console.error("Error in generateFeaturedContent:", err.message);
    return {
      introHeadline: "AI generation failed. Please try again later.",
      items: [],
    };
  }
}
