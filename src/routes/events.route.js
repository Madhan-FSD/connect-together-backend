import express from "express";
import FeatureStore from "../utils/featureStore.js";
import { Post } from "../models/post.model.js";
import Video from "../models/video.model.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { postId, videoId, type } = req.body;
  try {
    const id = postId || videoId;
    if (!id) return res.status(400).json({ error: "missing id" });
    await FeatureStore.incrementCounter(id, type || "views", 1);
    res.json({ ok: true });
  } catch (err) {
    console.error("event error", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
