import express from "express";
import { protect, protectChild } from "../middlewares/auth.middleware.js";
import {
  chatWithAI,
  buildProfileWithAI,
  moderateContent,
  analyzeSentiment,
  getSmartRecommendations,
  generateCaption,
  suggestHashtags,
  summarizePost,
  translateContent,
  getActivityInsights,
  generateLearningPath,
  enhanceText,
  describeImage,
  calculateSafetyScore,
} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", protect, chatWithAI);
router.post("/build-profile", protect, buildProfileWithAI);
router.post("/moderate-content", protect, moderateContent);
router.post("/analyze-sentiment", protect, analyzeSentiment);

router.get("/recommendations/:userId", protect, getSmartRecommendations);
router.get("/activity-insights/:childId", protect, getActivityInsights);

router.post("/generate-caption", protect, generateCaption);
router.post("/suggest-hashtags", protect, suggestHashtags);
router.post("/summarize-post", protect, summarizePost);
router.post("/translate", protect, translateContent);
router.post("/enhance-text", protect, enhanceText);
router.post("/describe-image", protect, describeImage);

router.post("/learning-path", protectChild, generateLearningPath);

router.post("/safety-score", protect, calculateSafetyScore);

export default router;
