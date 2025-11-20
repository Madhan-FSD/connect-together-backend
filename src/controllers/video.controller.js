import Video from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateSignedStreamingUrl,
} from "../utils/cloudinary.js";
import fs from "fs/promises";
import mongoose from "mongoose";
import { Comment } from "../models/post.model.js";
import { extractThumbnail } from "../utils/video.utils.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cleanupFile = async (path) => {
  if (!path) return;
  await fs.unlink(path).catch(() => {});
};

const checkPaidSubscription = async (viewerId, channelId) => {
  return true;
};

export const uploadVideo = async (req, res) => {
  const userId = req.userId;
  const {
    contentType = "VIDEO_CHANNEL",
    channelId,
    channelType,
    title,
    description,
    visibility = "PUBLIC",
    playlistId,
    duration: durationBody = 1,
  } = req.body;

  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile) return res.status(400).json({ error: "Video file required" });

  if (!title) {
    await cleanupFile(videoFile.path);
    await cleanupFile(thumbnailFile?.path);
    return res.status(400).json({ error: "Title required" });
  }

  try {
    const folder =
      channelId && channelType
        ? `channels/${channelId}/videos`
        : `users/${userId}/videos`;

    const privacy = visibility === "PAID_ONLY" ? "private" : "public";

    const videoUpload = await uploadOnCloudinary(
      videoFile.path,
      folder,
      privacy
    );
    if (!videoUpload) throw new Error("Video upload failed");

    const actualDuration = videoUpload.duration
      ? Math.ceil(videoUpload.duration)
      : Number(durationBody) || 1;

    let thumbUpload = null;
    let finalThumbnailPath = thumbnailFile?.path;

    if (!finalThumbnailPath) {
      finalThumbnailPath = await extractThumbnail(videoFile.path);
    }

    if (finalThumbnailPath) {
      thumbUpload = await uploadOnCloudinary(
        finalThumbnailPath,
        `${folder}/thumbs`
      );
      await cleanupFile(finalThumbnailPath);
    }

    const newVideo = await Video.create({
      contentType,
      ownerId: userId,
      channelId,
      channelType,
      title,
      description,
      duration: actualDuration,
      publicId: videoUpload.public_id,
      secureUrl: videoUpload.secure_url,
      thumbnailUrl: thumbUpload?.secure_url,
      visibility,
      videoStatus: "LIVE",
      playlistIds: playlistId ? [playlistId] : [],
    });

    if (playlistId) {
      try {
        const pl = await Playlist.findById(playlistId);
        if (pl) {
          pl.videos.push(newVideo._id);
          await pl.save();
        }
      } catch (e) {}
    }

    await cleanupFile(videoFile.path);

    return res.status(201).json({ video: newVideo });
  } catch (err) {
    await cleanupFile(videoFile?.path);
    await cleanupFile(thumbnailFile?.path);
    return res
      .status(500)
      .json({ error: "Upload failed", details: err.message });
  }
};

export const getSecureVideoUrl = asyncHandler(async (req, res) => {
  const viewerId = req.userId;
  const { videoId } = req.params;

  if (!viewerId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const video = await Video.findById(videoId).select(
    "publicId visibility channelId ownerId"
  );

  if (!video) {
    return res.status(404).json({ message: "Video not found." });
  }

  let signedUrl;

  if (video.visibility === "PAID_ONLY") {
    const isOwner = video.ownerId.toString() === viewerId.toString();
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      if (!video.channelId) {
        return res
          .status(500)
          .json({ message: "Video channel information is missing." });
      }
      isAuthorized = await checkPaidSubscription(viewerId, video.channelId);
    }

    if (!isAuthorized) {
      return res
        .status(403)
        .json({ message: "Subscription required to access this video." });
    }

    signedUrl = generateSignedStreamingUrl(video.publicId);
  } else {
    signedUrl = cloudinary.url(video.publicId, {
      resource_type: "video",
      secure: true,
      streaming_profile: "hd",
      format: "m3u8",
    });
  }

  return res.status(200).json({ secureUrl: signedUrl });
});

export const getVideoDetails = async (req, res) => {
  const { videoId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(videoId))
      return res.status(400).json({ error: "Invalid video id" });

    const video = await Video.findById(videoId).populate(
      "ownerId",
      "firstName lastName avatar"
    );
    if (!video) return res.status(404).json({ error: "Video not found." });

    const comments = await Comment.find({
      targetId: videoId,
      targetType: "Video",
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "firstName lastName avatar");

    return res.status(200).json({ video, comments });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch video details." });
  }
};

export const deleteVideo = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;

  try {
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: "Video not found." });

    const isOwner = video.ownerId.toString() === userId.toString();
    if (!isOwner)
      return res
        .status(403)
        .json({ error: "Not authorized to delete this video." });

    if (video.publicId)
      await deleteFromCloudinary(video.publicId).catch(() => {});

    await Comment.deleteMany({
      targetId: video._id,
      targetType: "Video",
    }).catch(() => {});

    await Video.deleteOne({ _id: videoId });

    return res.status(200).json({ message: "Video deleted successfully." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to delete video.", details: err.message });
  }
};

export const addVideoComment = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;
  const { content } = req.body;

  if (!content?.trim())
    return res.status(400).json({ error: "Comment content cannot be empty." });

  try {
    const video = await Video.findById(videoId).select("commentsCount");
    if (!video) return res.status(404).json({ error: "Video not found." });

    const newComment = await Comment.create({
      targetId: videoId,
      targetType: "Video",
      ownerId: userId,
      content,
    });

    video.commentsCount += 1;
    await video.save();

    const populated = await Comment.findById(newComment._id).populate(
      "ownerId",
      "firstName lastName avatar"
    );

    return res
      .status(201)
      .json({ message: "Comment added successfully.", comment: populated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to add comment." });
  }
};

export const getVideoComments = async (req, res) => {
  const { videoId } = req.params;

  try {
    const comments = await Comment.find({
      targetId: videoId,
      targetType: "Video",
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "firstName lastName avatar");

    return res.status(200).json({ comments });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch comments." });
  }
};

export const deleteVideoComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userId;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const video = await Video.findById(comment.targetId).select(
      "ownerId commentsCount"
    );

    const isOwner = comment.ownerId.toString() === userId.toString();
    const isVideoOwner =
      video && video.ownerId.toString() === userId.toString();

    if (!isOwner && !isVideoOwner)
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment." });

    await Comment.deleteOne({ _id: commentId });

    if (video) {
      video.commentsCount = Math.max(0, video.commentsCount - 1);
      await video.save();
    }

    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete comment." });
  }
};
