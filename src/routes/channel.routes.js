import express from "express";
import {
  createChildChannel,
  createUserChannel,
  updateChannelDetails,
  updateChannelAvatar,
  updateChannelBanner,
  deleteChannel,
  getUserOwnChannel,
  getChildOwnChannel,
  getChannelByHandle,
  getChannelPosts,
  getChannelVideos,
  getChannelAnalytics,
  searchChannels,
} from "../controllers/channel.controller.js";
import { protect, protectChild } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post(
  "/child/create",
  protectChild,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createChildChannel
);

router.post(
  "/user/create",
  protect,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createUserChannel
);

router.get("/user/me", protect, getUserOwnChannel);

router.get("/child/:childId", protectChild, getChildOwnChannel);

router.get("/handle/:handle", protect, getChannelByHandle);

router.get("/handle/:handle/posts", protect, getChannelPosts);
router.get("/handle/:handle/videos", protect, getChannelVideos);

router.put("/:channelId/update", protect, updateChannelDetails);

router.put(
  "/:channelId/avatar",
  protect,
  upload.single("avatar"),
  updateChannelAvatar
);

router.put(
  "/:channelId/banner",
  protect,
  upload.single("banner"),
  updateChannelBanner
);

router.delete("/:channelId", protect, deleteChannel);

router.get("/analytics/me", protect, getChannelAnalytics);

router.get("/search", protect, searchChannels);

export default router;
