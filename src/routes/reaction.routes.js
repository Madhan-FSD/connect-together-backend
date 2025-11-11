import express from "express";
import {
  toggleReaction,
  getReactionsSummary,
  getUserReaction,
} from "../controllers/reaction.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/toggle", protect, toggleReaction);
router.get("/summary", protect, getReactionsSummary);
router.get("/user", protect, getUserReaction);

export default router;
