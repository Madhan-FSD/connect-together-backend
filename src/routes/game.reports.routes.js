import express from "express";
import { protect, protectChild } from "../middlewares/auth.middleware.js";
import {
  getDailyReport,
  getLeaderboard,
  getChildWallet,
} from "../controllers/game.report.controller.js";

const router = express.Router();

router.get("/daily/:childId", protectChild, getDailyReport);

router.get("/leaderboard", protectChild, getLeaderboard);

router.get("/wallet/:childId", protectChild, getChildWallet);

export default router;
