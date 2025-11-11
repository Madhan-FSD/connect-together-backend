import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  followEntity,
  unfollowEntity,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  getFollowerCount,
} from "../controllers/follower.controller.js";

const router = express.Router();

router.use(protect);

/**
 * FOLLOWERS
 */
router.post("/follow", followEntity);
router.post("/unfollow", unfollowEntity);
router.get("/:entityType/:entityId", getFollowers);
router.get("/status/:entityType/:entityId", checkFollowStatus);
router.get("/count/:entityType/:entityId", getFollowerCount);

export default router;
