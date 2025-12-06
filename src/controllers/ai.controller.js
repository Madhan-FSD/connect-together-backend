import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";
import AIInsight from "../models/aiinsights.model.js";
import { cleanJson } from "../utils/aiUtils.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ error: "Message is required." });

    const systemInstruction =
      "You are a highly factual and concise AI assistant. For all current events, real-time data, and questions involving dates (like current political leaders or recent news), you MUST use the enabled Google Search tool to verify your answer before responding. Only rely on your internal knowledge for historical or general context.";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
      systemInstruction,
    });

    const chat = model.startChat({
      history: [],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      },
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    while (response.toolCalls && response.toolCalls.length > 0) {
      const toolRequest = response.toolCalls[0];

      if (toolRequest.googleSearch) {
        const searchResponse = await genAI.tools.googleSearch({
          query: toolRequest.googleSearch.query,
        });

        result = await chat.sendMessage({
          toolResult: {
            id: toolRequest.id,
            result: searchResponse,
          },
        });

        response = result.response;
      }
    }

    res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ error: "Failed to process chat message." });
  }
};

export const buildProfileWithAI = async (req, res) => {
  try {
    const profile = req.body;

    const userId = profile?._id;
    const userRole = profile.role || "NORMAL_USER";

    const hasSkills =
      Array.isArray(profile.skills) && profile.skills.length > 0;
    const hasAchievements =
      Array.isArray(profile.achievements) && profile.achievements.length > 0;
    const hasInterests =
      Array.isArray(profile.interests) && profile.interests.length > 0;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication details (userId) are missing." });
    }

    if (!profile.core && !hasSkills && !hasAchievements && !hasInterests) {
      return res.status(400).json({
        error: "Profile data is empty. Cannot generate a resume.",
      });
    }

    const core = profile.core || {};
    const coreData = {
      name: `${profile.firstName} ${profile.lastName}`,
      title: profile.profileHeadline || "N/A",
      email: profile.email || "N/A",
      location:
        profile.addresses && profile.addresses.length > 0
          ? `${profile.addresses[0].city}, ${profile.addresses[0].state}`
          : "N/A",
      summary: profile.about || core.summary || "N/A",
    };

    const skillList = profile.skills.map((s) => s.name).join("; ");
    const achievementList = profile.achievements
      .map((a) => `${a.name}: ${a.description}`)
      .join("; ");
    const interestList = profile.interests.map((i) => i.name).join(", ");

    const experienceList = profile.experiences
      .map(
        (e) => `${e.title} at ${e.company} (${e.location}): ${e.description}`,
      )
      .join(" || ");

    const educationList = profile.educations
      .map((e) => `${e.degree} in ${e.fieldOfStudy} from ${e.institution}`)
      .join(" || ");

    const certificationList = profile.certifications
      .map((c) => `${c.name} (${c.issuingOrganization})`)
      .join("; ");

    const normalizedInput = JSON.stringify({
      core: coreData,
      skills: skillList,
      achievements: achievementList,
      interests: interestList,
      experiences: experienceList,
      educations: educationList,
      certifications: certificationList,
    });

    const cachedInsight = await AIInsight.findOne({
      userId: userId,
      insightType: "RESUME_GENERATION_HTML",
      "data.input_profile": normalizedInput,
    });

    if (cachedInsight) {
      console.log(`Cache hit: Returning stored resume for user ${userId}.`);
      return res
        .status(200)
        .json({ resume_html: cachedInsight.data.resume_html });
    }

    const prompt = `You are an expert resume writer. Your task is to generate a complete, professional Curriculum Vitae (CV) formatted as RAW HTML.

    **STRICT REQUIREMENT: USE PROVIDED DATA ONLY**
    1.  **FILL ALL CONTENT:** You must fully populate the resume sections using the provided PROFILE DATA.
    2.  **STRICT MAPPING:** Use the exact names, titles, companies, skills, and descriptions provided. Frame these facts professionally; DO NOT invent or add any fictional content.
    3.  **NO PLACEHOLDERS:** ABSOLUTELY DO NOT use bracketed placeholders (e.g., [Name]) or random names/companies.
    4.  **ALIGNMENT:** Ensure **ALL** generated content (headings, paragraphs, lists, and list items) is **LEFT-ALIGNED**.

    **HTML Structure and Tailwind Formatting (LEFT ALIGNED):**
    - Main container: Use <div class="p-6 bg-white shadow-xl rounded-lg">
    - Name/Contact Block: Use <div class="mb-6 border-b pb-4 text-left"> 
      (Ensuring contact info is left-aligned)
    - Name: Use <h1 class="text-4xl font-bold text-gray-800">
    - Section Headings (Summary, Experience, etc.): Use <h2 class="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 mt-4 mb-2 pb-1 text-left">
    - Experience/Achievement Bullet Points: Use <ul class="list-disc list-inside space-y-1 text-gray-700 ml-4 text-left"> and <li>.
      (NOTE: Adding 'text-left' to the UL tag for maximum compatibility.)
    - Summary/About Paragraphs: Use <p class="text-gray-600 mb-4 text-left">
      (NOTE: Explicitly adding 'text-left' to P tags.)
    - Other text elements (like job titles, dates): Ensure these also use a text-left utility class or are placed within a left-aligned container.

    PROFILE DATA TO BE USED (The AI MUST integrate this information directly):
    
    CORE DETAILS: ${JSON.stringify(coreData)}

    SKILLS: ${skillList}

    EXPERIENCE: ${experienceList}
    
    EDUCATION: ${educationList}

    CERTIFICATIONS: ${certificationList}

    ACHIEVEMENTS: ${achievementList}

    INTERESTS: ${interestList}

    Output ONLY the RAW HTML content with Tailwind classes.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const generatedHTML = result.response.text().trim();

    console.log(
      `Cache miss: Generating and storing new resume for user ${userId}.`,
    );

    await AIInsight.create({
      userId: userId,
      insightType: "RESUME_GENERATION_HTML",
      role: userRole,
      data: {
        resume_html: generatedHTML,
        input_profile: normalizedInput,
      },
    });

    res.status(200).json({ resume_html: generatedHTML });
  } catch (error) {
    console.error("Error in AI profile building:", error);
    res.status(500).json({ error: "Failed to generate profile." });
  }
};

export const moderateContent = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Analyze the following content for safety and appropriateness.
    Respond in JSON: { "isSafe": true/false, "reason": "...", "suggestions": "..." }
    Content: "${content}"`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error in content moderation:", error);
    res.status(500).json({ error: "Failed to moderate content." });
  }
};

export const analyzeSentiment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `Analyze the emotional tone and sentiment of the following text: "${content}".
    Determine if the overall sentiment is 'positive', 'negative', or 'neutral'.`;

    const result = await model.generateContent({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            sentiment: {
              type: "string",
              description:
                "The primary sentiment, must be 'positive', 'negative', or 'neutral'.",
              enum: ["positive", "negative", "neutral"],
            },
            analysis: {
              type: "string",
              description:
                "A detailed explanation of why that sentiment was chosen, citing specific words or phrases.",
            },
          },
          required: ["sentiment", "analysis"],
        },
      },
    });

    const data = JSON.parse(result.response.text);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error analyzing sentiment:", error);

    res.status(500).json({ error: "Failed to analyze sentiment." });
  }
};

export const getSmartRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const INSIGHT_TYPE = "RECOMMENDATION";
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cachedInsight = await AIInsight.findOne({
      userId: userId,
      insightType: INSIGHT_TYPE,
      generatedAt: { $gte: oneDayAgo },
    }).lean();

    if (cachedInsight) {
      return res.status(200).json({
        ...cachedInsight.data,
        message: "Data from cache, generated less than 24 hours ago.",
      });
    }

    let user = await User.findById(userId).lean();
    let isChild = false;
    let parentUser = null;

    if (!user) {
      parentUser = await User.findOne({ "children._id": userId })
        .select("children")
        .lean();

      if (parentUser) {
        user = parentUser.children.find(
          (c) => c._id.toString() === userId.toString(),
        );
        isChild = true;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User or Child not found." });
    }

    const profileSummary = {
      name:
        user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      role: user.role || (isChild ? "CHILD" : "NORMAL_USER"),
      age: user.age || null,
      about:
        user.about ||
        "No detailed profile information available yet. Please base recommendations on general educational, creative, and personal growth interests.",
      skills: user.skills?.map((s) => s.name) || [],
      interests:
        user.interests?.map((i) => i.name || i.category || "General") || [],
      certifications:
        user.certifications?.map((c) => c.name || c.issuingOrganization) || [],
      achievements:
        user.achievements?.map((a) => a.name || a.description) || [],
      projects: user.projects?.map((p) => p.name || p.description) || [],
      educations:
        user.educations?.map(
          (e) => `${e.degree || ""} at ${e.institution || ""}`,
        ) || [],
      featuredContent:
        user.featuredContent?.items?.map((i) => i.headline || i.category) || [],
    };

    const prompt = `
Generate 5 personalized recommendations for ${
      profileSummary.name || "this user"
    } (${profileSummary.role}).

Base it on:
- Skills: ${profileSummary.skills.join(", ") || "No specific skills"}
- Interests: ${profileSummary.interests.join(", ") || "No interests listed"}
- Achievements: ${profileSummary.achievements.join(", ") || "None"}
- Projects: ${profileSummary.projects.join(", ") || "None"}
- Education: ${
      profileSummary.educations.join(", ") || "No formal education data"
    }
- About: ${profileSummary.about}

Respond **only** in JSON:
{
  "recommendations": [
    {
      "title": "string",
      "type": "string",
      "reason": "string",
      "category": "string"
    }
  ]
}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const textResponse = result.response?.text?.() || "";

    let data;
    try {
      data = JSON.parse(cleanJson(textResponse));
    } catch (err) {
      console.warn("AI JSON parse failed, returning fallback data.");
      data = {
        recommendations: [
          {
            title: "Explore New Learning Paths",
            type: "education",
            category: "General",
            reason:
              "Personalized insights are limited. Based on your profile, we suggest exploring self-improvement and creative learning opportunities.",
          },
        ],
      };
    }

    await AIInsight.create({
      userId: userId,
      role: isChild ? "CHILD" : "NORMAL_USER",
      insightType: INSIGHT_TYPE,
      data: data,
    }).catch((storeErr) =>
      console.error("Failed to store AI Insight:", storeErr),
    );

    res.status(200).json({
      userType: isChild ? "CHILD" : "USER",
      parentId: parentUser?._id || null,
      ...data,
      message: "New recommendations generated and stored.",
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
};

export const generateCaption = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl)
      return res.status(400).json({ error: "Image URL is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Create a catchy caption (10-20 words) for this image: ${imageUrl}`;
    const result = await model.generateContent(prompt);
    res.status(200).json({ caption: result.response.text().trim() });
  } catch (error) {
    console.error("Error generating caption:", error);
    res.status(500).json({ error: "Failed to generate caption." });
  }
};

export const suggestHashtags = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Suggest 10 relevant hashtags for: "${content}"
    Respond in JSON: { "hashtags": ["#example1", "#example2", ...] }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error suggesting hashtags:", error);
    res.status(500).json({ error: "Failed to suggest hashtags." });
  }
};

export const summarizePost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Summarize this in 2-3 sentences: "${content}".
    Respond in JSON: { "summary": "..." }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error summarizing post:", error);
    res.status(500).json({ error: "Failed to summarize post." });
  }
};

export const translateContent = async (req, res) => {
  try {
    const { content, targetLanguage } = req.body;
    if (!content || !targetLanguage)
      return res
        .status(400)
        .json({ error: "Content and target language required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Translate this to ${targetLanguage}: "${content}"
    Respond in JSON: { "translation": "..." }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error translating content:", error);
    res.status(500).json({ error: "Failed to translate content." });
  }
};

export const getActivityInsights = async (req, res) => {
  try {
    const { childId } = req.params;

    if (!childId) {
      return res.status(400).json({ error: "Child ID is required." });
    }

    const INSIGHT_TYPE = "ACTIVITY_SUMMARY";

    const parentUser = await User.findOne({ "children._id": childId }).lean();
    if (!parentUser) {
      return res
        .status(404)
        .json({ error: "Child or parent user not found for insights." });
    }

    const child = parentUser.children.find(
      (c) => c._id.toString() === childId.toString(),
    );
    if (!child) {
      return res.status(404).json({ error: "Child not found." });
    }

    const hasData =
      (child.activities && child.activities.length > 0) ||
      (child.skills && child.skills.length > 0) ||
      (child.projects && child.projects.length > 0) ||
      (child.interests && child.interests.length > 0) ||
      (child.achievements && child.achievements.length > 0) ||
      (child.educations && child.educations.length > 0);

    if (!hasData) {
      return res.status(200).json({
        summary: null,
        patterns: [],
        recommendations: [],
        message: "Not enough data available to generate AI insights.",
      });
    }

    const cachedInsight = await AIInsight.findOne({
      userId: childId,
      insightType: INSIGHT_TYPE,
    })
      .sort({ generatedAt: -1 })
      .lean();

    const lastUpdated = new Date(
      Math.max(
        new Date(child.updatedAt || 0),
        ...[
          ...(child.activities || []).map((a) => new Date(a.updatedAt || 0)),
          ...(child.skills || []).map((s) => new Date(s.updatedAt || 0)),
          ...(child.achievements || []).map((a) => new Date(a.updatedAt || 0)),
          ...(child.projects || []).map((p) => new Date(p.updatedAt || 0)),
          ...(child.educations || []).map((e) => new Date(e.updatedAt || 0)),
          ...(child.interests || []).map((i) => new Date(i.updatedAt || 0)),
        ],
      ),
    );

    const isInsightStale =
      !cachedInsight ||
      new Date(cachedInsight.generatedAt) < lastUpdated ||
      new Date(cachedInsight.generatedAt) <
        new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (!isInsightStale) {
      return res.status(200).json({
        ...cachedInsight.data,
        message: "Data from cache, no updates detected.",
      });
    }

    const contextData = {
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      age: calculateAge(child.dob),
      about: child.about,
      activities: child.activities,
      skills: child.skills,
      interests: child.interests,
      projects: child.projects,
      achievements: child.achievements,
      educations: child.educations,
    };

    const totalItems =
      (contextData.activities?.length || 0) +
      (contextData.skills?.length || 0) +
      (contextData.projects?.length || 0) +
      (contextData.interests?.length || 0) +
      (contextData.achievements?.length || 0);
    if (totalItems < 2) {
      return res.status(200).json({
        summary: null,
        patterns: [],
        recommendations: [],
        message: "Insufficient child data to generate insights.",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `
You are an educational child behavior analyst. Based ONLY on the provided child data (no assumptions), 
summarize behavior and learning patterns. 
If data is insufficient, say "Not enough data" (in summary). 
Return JSON in this structure:
{
  "summary": "...",
  "patterns": [{ "name": "...", "description": "..." }],
  "recommendations": [{ "title": "...", "reason": "..." }]
}

Child Data:
${JSON.stringify(contextData, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response?.text?.() || "";
    let data;

    try {
      data = JSON.parse(cleanJson(textResponse));
    } catch (err) {
      console.warn("AI JSON parse failed, using fallback data.");
      data = {
        summary: "Not enough structured data to generate insights.",
        patterns: [],
        recommendations: [],
      };
    }

    if (
      !data.summary ||
      data.summary.toLowerCase().includes("not enough data")
    ) {
      return res.status(200).json({
        summary: null,
        patterns: [],
        recommendations: [],
        message: "Not enough data for AI to analyze.",
      });
    }

    await AIInsight.create({
      userId: childId,
      role: "CHILD",
      insightType: INSIGHT_TYPE,
      data,
      generatedAt: new Date(),
    });

    res.status(200).json({
      ...data,
      message: "New AI insights generated successfully.",
    });
  } catch (error) {
    console.error("Error generating activity insights:", error);
    res.status(500).json({ error: "Failed to generate activity insights." });
  }
};

export const generateLearningPath = async (req, res) => {
  try {
    const { interests } = req.body;
    if (!interests)
      return res.status(400).json({ error: "Interests are required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Create a personalized learning path for a child interested in: ${interests}
    Respond in JSON: { "topics": [{ "title": "...", "description": "...", "resources": "..." }] }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error generating learning path:", error);
    res.status(500).json({ error: "Failed to generate learning path." });
  }
};

export const enhanceText = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Enhance this text for clarity and grammar: "${content}"
    Respond in JSON: { "enhanced": "...", "improvements": "..." }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error enhancing text:", error);
    res.status(500).json({ error: "Failed to enhance text." });
  }
};

export const describeImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl)
      return res.status(400).json({ error: "Image URL is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Describe this image: ${imageUrl}
    Respond in JSON: { "description": "...", "objects": [...] }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error describing image:", error);
    res.status(500).json({ error: "Failed to describe image." });
  }
};

export const calculateSafetyScore = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ error: "Content is required." });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Evaluate the safety score of: "${content}"
    Respond in JSON: { "score": 0-100, "level": "safe/moderate/unsafe", "concerns": [], "explanation": "..." }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error calculating safety score:", error);
    res.status(500).json({ error: "Failed to calculate safety score." });
  }
};
