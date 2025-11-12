import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getDashboard,
  updateChildPermission,
  addChild,
  getChildDetails,
} from "../controllers/user.controller.js";
import { getComprehensiveDashboardData } from "../utils/dataFetcher.js";

const router = express.Router();

/**
 * @prefix /api/users
 */

router.get("/dashboard", protect, getDashboard);

router.put("/controls/:childId", protect, updateChildPermission);

router.post("/child", protect, addChild);

router.get("/child/:childId", protect, getChildDetails);

router.get("/insights/:childId", async (req, res) => {
  try {
    const { childId } = req.params;
    const dashboardData = await getComprehensiveDashboardData(childId);

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Failed to retrieve dashboard data." });
  }
});

export default router;
