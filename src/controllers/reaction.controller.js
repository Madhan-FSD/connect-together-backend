import mongoose from "mongoose";
import Reaction from "../models/reaction.model.js";
import Post from "../models/post.model.js";
import Video from "../models/video.model.js";
import Notification from "../models/notification.model.js";

/**
 * Toggle or change a reaction.
 * body: { targetType: "Post"|"Video", targetId: "...", type: "LIKE"|"LOVE"|... }
 */
export const toggleReaction = async (req, res) => {
  try {
    const actor = req.userId || req.user?.id;
    const { targetType, targetId, type } = req.body;

    if (!actor) return res.status(401).json({ error: "Unauthorized" });
    if (!["Post", "Video"].includes(targetType))
      return res.status(400).json({ error: "Unsupported targetType" });
    if (!mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid targetId" });

    const existing = await Reaction.findOne({ actor, targetType, targetId });

    if (existing) {
      if (existing.type === type) {
        // remove
        await existing.deleteOne();
      } else {
        existing.type = type;
        await existing.save();
      }
    } else {
      await Reaction.create({ actor, targetType, targetId, type });
    }

    // aggregate counts (for client)
    const counts = await Reaction.aggregate([
      { $match: { targetType, targetId: mongoose.Types.ObjectId(targetId) } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // optional: update a counter on target doc (simple approach)
    if (targetType === "Post") {
      const post = await Post.findById(targetId);
      if (post) {
        post.reactionCounts = counts.reduce(
          (acc, r) => ({ ...acc, [r._id]: r.count }),
          {}
        );
        await post.save();
      }
    } else if (targetType === "Video") {
      const video = await Video.findById(targetId);
      if (video) {
        video.reactionCounts = counts.reduce(
          (acc, r) => ({ ...acc, [r._id]: r.count }),
          {}
        );
        await video.save();
      }
    }

    // create notification for owner (non-batch simple)
    try {
      const targetOwnerId =
        targetType === "Post"
          ? (await Post.findById(targetId)).user
          : (await Video.findById(targetId)).user;
      if (targetOwnerId && targetOwnerId.toString() !== actor.toString()) {
        await Notification.create({
          user: targetOwnerId,
          actor,
          type: "POST_LIKED",
          payload: { targetType, targetId, reactionType: type },
        });
      }
    } catch (e) {
      // don't block user request on notification errors
      console.warn("Notification create failed:", e?.message || e);
    }

    return res.status(200).json({ message: "Reaction updated", counts });
  } catch (err) {
    console.error("toggleReaction:", err);
    return res.status(500).json({ error: "Failed to toggle reaction" });
  }
};

/**
 * Get reaction summary for a target.
 * query: ?targetType=Post&targetId=...
 */
export const getReactionsSummary = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!["Post", "Video", "Comment"].includes(targetType))
      return res.status(400).json({ error: "Unsupported targetType" });

    const counts = await Reaction.aggregate([
      { $match: { targetType, targetId: mongoose.Types.ObjectId(targetId) } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    return res.status(200).json({ counts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reactions" });
  }
};
