import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getDailyReport,
  getLeaderboard,
  getChildWallet,
} from "../controllers/game.report.controller.js";

const router = express.Router();

router.get("/daily/:childId", protect, getDailyReport);

router.get("/leaderboard", protect, getLeaderboard);

router.get("/wallet/:childId", protect, getChildWallet);

export default router;
