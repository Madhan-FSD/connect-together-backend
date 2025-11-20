import express from "express";
import upload from "../middlewares/multer.middleware.js";
import {
  optionalAuth,
  protect,
  protectChild,
} from "../middlewares/auth.middleware.js";
import { createChildChannel } from "../controllers/child.controller.js";
import {
  createNormalUserChannel,
  deleteChannel,
  getChannelAnalytics,
  getChannelDetails,
  getChannelPostsByHandle,
  getChannelSubscribers,
  getChannelVideosByHandle,
  subscribeToChannel,
  unsubscribeFromChannel,
  updateChannelAvatar,
  updateChannelBanner,
  updateChannelDetails,
  updateChannelVisibility,
  getChannelDetailsByHandle,
  getChannelSubscriberCount,
  checkSubscriptionStatus,
  getPersonalChannelFeed,
  updateChannelFeaturedContent,
  searchAllChannels,
  updateChannelPermissions,
  getChannelUploadHistory,
  reportChannel,
  deleteChannelAvatar,
} from "../controllers/channels.controller.js";

const router = express.Router();

router.post(
  "/child/:childId/create",
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
  createNormalUserChannel
);

router.get("/handle/:handle/posts", optionalAuth, getChannelPostsByHandle);
router.get("/handle/:handle/videos", optionalAuth, getChannelVideosByHandle);
router.get("/handle/:handle/details", optionalAuth, getChannelDetailsByHandle);
router.get("/search", optionalAuth, searchAllChannels);
router.get("/:channelId", optionalAuth, getChannelDetails);

router.use(protect);

router.put("/:channelId/update", updateChannelDetails);

router.put("/:channelId/avatar", upload.single("avatar"), updateChannelAvatar);

router.put("/:channelId/banner", upload.single("banner"), updateChannelBanner);

router.put("/:channelId/visibility", updateChannelVisibility);

router.post("/:channelId/subscribe", subscribeToChannel);
router.post("/:channelId/unsubscribe", unsubscribeFromChannel);

router.get("/:channelId/subscribers", getChannelSubscribers);

router.get("/:channelId/analytics", getChannelAnalytics);

router.delete("/:channelId", deleteChannel);

router.get("/:channelId/count/subscribers", getChannelSubscriberCount);

router.get("/:channelId/subscription/status", checkSubscriptionStatus);

router.get("/feed", getPersonalChannelFeed);

router.put("/:channelId/permissions", updateChannelPermissions);

router.put("/:channelId/featured", updateChannelFeaturedContent);

router.get("/search", searchAllChannels);

router.get("/:channelId/uploads/history", getChannelUploadHistory);

router.delete("/:channelId/avatar", deleteChannelAvatar);

router.post("/:channelId/report", reportChannel);

export default router;
