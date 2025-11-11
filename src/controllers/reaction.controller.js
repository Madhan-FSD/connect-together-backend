import mongoose from "mongoose";
import Reaction from "../models/reaction.model.js";
import { Post, Comment } from "../models/post.model.js";
import Video from "../models/video.model.js";
import Notification from "../models/notification.model.js";

export const toggleReaction = async (req, res) => {
  try {
    const actor = req.userId || req.user?.id;
    const { targetType, targetId, type } = req.body;

    if (!actor) return res.status(401).json({ error: "Unauthorized" });
    if (!["Post", "Video", "Comment"].includes(targetType))
      return res.status(400).json({ error: "Unsupported targetType" });
    if (!mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid targetId" });

    const existing = await Reaction.findOne({ actor, targetType, targetId });

    if (existing) {
      if (existing.type === type) {
        await existing.deleteOne();
      } else {
        existing.type = type;
        await existing.save();
      }
    } else {
      await Reaction.create({ actor, targetType, targetId, type });
    }

    const counts = await Reaction.aggregate([
      {
        $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const summary = counts.reduce(
      (acc, r) => ({ ...acc, [r._id]: r.count }),
      {}
    );
    const totalReactions = Object.values(summary).reduce((a, b) => a + b, 0);

    if (targetType === "Post") {
      await Post.findByIdAndUpdate(targetId, {
        reactionCounts: summary,
        totalReactions,
      });
    } else if (targetType === "Video") {
      await Video.findByIdAndUpdate(targetId, {
        reactionCounts: summary,
        totalReactions,
      });
    } else if (targetType === "Comment") {
      await Comment.findByIdAndUpdate(targetId, {
        reactionCounts: summary,
        totalReactions,
      });
    }

    try {
      const Model =
        targetType === "Post"
          ? Post
          : targetType === "Video"
          ? Video
          : targetType === "Comment"
          ? Comment
          : null;

      const targetDoc = Model
        ? await Model.findById(targetId).select("user")
        : null;
      const targetOwnerId = targetDoc?.user;

      if (targetOwnerId && targetOwnerId.toString() !== actor.toString()) {
        await Notification.create({
          user: targetOwnerId,
          actor,
          type: "REACTION",
          payload: { targetType, targetId, reactionType: type },
        });
      }
    } catch (e) {
      console.warn("Notification create failed:", e?.message);
    }

    return res.status(200).json({
      message: "Reaction updated",
      counts: summary,
      totalReactions,
      userReaction: type,
    });
  } catch (err) {
    console.error("toggleReaction:", err);
    return res.status(500).json({ error: "Failed to toggle reaction" });
  }
};

export const getReactionsSummary = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!["Post", "Video", "Comment"].includes(targetType))
      return res.status(400).json({ error: "Unsupported targetType" });

    const counts = await Reaction.aggregate([
      {
        $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const summary = counts.reduce(
      (acc, r) => ({ ...acc, [r._id]: r.count }),
      {}
    );
    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    return res.status(200).json({ summary, total });
  } catch (err) {
    console.error("getReactionsSummary:", err);
    return res.status(500).json({ error: "Failed to fetch reactions" });
  }
};

export const getUserReaction = async (req, res) => {
  try {
    const actor = req.userId || req.user?.id;
    const { targetType, targetId } = req.query;

    const existing = await Reaction.findOne({
      actor,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    });

    return res.status(200).json({ userReaction: existing?.type || null });
  } catch (err) {
    console.error("getUserReaction:", err);
    return res.status(500).json({ error: "Failed to fetch user reaction" });
  }
};

export const deleteReactionsForTarget = async (targetType, targetId) => {
  try {
    await Reaction.deleteMany({ targetType, targetId });
  } catch (err) {
    console.error("deleteReactionsForTarget:", err);
  }
};
