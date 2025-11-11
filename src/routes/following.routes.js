import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getFollowing } from "../controllers/follower.controller.js";

const router = express.Router();

router.use(protect);

router.get("/:userId", getFollowing);

export default router;
