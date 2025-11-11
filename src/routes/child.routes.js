import express from "express";
import { protectChild } from "../middlewares/auth.middleware.js";
import {
  createChannelPost,
  createProfilePost,
  likePost,
  createChildChannel,
  completeContent,
} from "../controllers/child.controller.js";

const router = express.Router();

// Child Posting Routes
router.post("/:childId/create/channel/posts", protectChild, createChannelPost);
router.post("/:childId/create/profile/posts", protectChild, createProfilePost);

// Like Posts
router.post("/:childId/like/:postId", protectChild, likePost);

// Learning Content Completion
router.post(
  "/:childId/content/:contentId/complete",
  protectChild,
  completeContent
);

export default router;
