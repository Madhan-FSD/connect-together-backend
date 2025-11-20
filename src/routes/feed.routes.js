import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getSubscriptionsFeed,
  getPersonalizedFeed,
  getExploreFeed,
  getTrending,
} from "../controllers/feed.controller.js";

const router = express.Router();
router.use(protect);

router.get("/subscriptions", getSubscriptionsFeed);
router.get("/personalized", getPersonalizedFeed);
router.get("/explore", getExploreFeed);
router.get("/trending", getTrending);

export default router;
