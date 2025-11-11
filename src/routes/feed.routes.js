import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getPersonalizedFeed,
  getExploreFeed,
  getTrendingPosts,
} from "../controllers/feed.controller.js";

const router = express.Router();

router.use(protect);

/**
 * FEED
 */
router.get("/personalized", getPersonalizedFeed);
router.get("/explore", getExploreFeed);
router.get("/trending", getTrendingPosts);

export default router;
