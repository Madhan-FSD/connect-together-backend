import express from "express";
import upload from "../middlewares/multer.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  uploadVideo,
  getSecureVideoUrl,
} from "../controllers/video.controller.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);

router.get("/:videoId/play", protect, getSecureVideoUrl);

export default router;
