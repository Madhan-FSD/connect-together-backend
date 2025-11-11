import Video from "../models/video.model.js";
import UserChannel from "../models/userchannel.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { logActivity } from "../utils/activityLog.js";
import { checkUploadGuardrails } from "../utils/permissionGuardrails.js";
import fs from "fs";

export const uploadVideo = async (req, res) => {
  const { childId, title, duration } = req.body;
  const filePath = req.file?.path;

  const requesterId = req.userId;
  const requesterRole = req.role;

  let effectiveOwnerId = requesterId;
  let effectiveChannelId = null;
  let effectiveParentId = null;
  let targetFolder = null;
  let isSupervisedPost = false;
  let publicId = null;

  if (requesterRole === "CHILD") {
    isSupervisedPost = true;
    if (!req.parentId) {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res
        .status(403)
        .json({ error: "Child user is missing parent context." });
    }
    effectiveParentId = req.parentId;
    targetFolder = `users/${req.parentId}/${requesterId}/videos`;
  } else if (requesterRole === "PARENT") {
    if (childId) {
      isSupervisedPost = true;
      effectiveOwnerId = childId;
      effectiveParentId = requesterId;
      targetFolder = `users/${requesterId}/${childId}/videos`;
    } else {
      targetFolder = `users/${requesterId}/videos`;
    }
  } else if (requesterRole === "NORMAL_USER") {
    targetFolder = `users/${requesterId}/videos`;
  } else {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(401).json({ error: "Unauthorized upload context." });
  }

  if (!title || !duration || !req.file) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res
      .status(400)
      .json({ error: "Missing required fields (title, duration) or file." });
  }

  const contentType = isSupervisedPost ? "UGC_POST" : "UGC_CHANNEL";

  try {
    let channelDoc = null;

    if (isSupervisedPost) {
      const {
        isAllowed,
        message,
        channel: retrievedChannel,
      } = await checkUploadGuardrails(effectiveParentId, effectiveOwnerId);

      if (!isAllowed) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await logActivity(
          "UPLOAD_FAILED",
          effectiveParentId,
          effectiveOwnerId,
          null,
          null,
          message
        );
        return res.status(403).json({ error: message });
      }
      channelDoc = retrievedChannel;
    } else {
      channelDoc = await UserChannel.findOne({ owner: requesterId });
      if (!channelDoc) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(404).json({
          error: "User channel not found. Please create a channel first.",
        });
      }
    }
    effectiveChannelId = channelDoc._id;

    const result = await uploadOnCloudinary(filePath, targetFolder);

    if (!result) {
      throw new Error("Cloudinary upload failed.");
    }

    publicId = result.public_id;

    const newVideo = new Video({
      ownerId: effectiveOwnerId,
      channelId: effectiveChannelId,
      parentId: effectiveParentId,
      childId: isSupervisedPost ? effectiveOwnerId : null,
      contentType: contentType,

      title: title,
      duration: parseInt(duration),
      publicId: publicId,
      secureUrl: result.secure_url,
    });

    const savedVideo = await newVideo.save();

    if (isSupervisedPost) {
      await logActivity(
        "POSTED",
        effectiveParentId,
        effectiveOwnerId,
        null,
        savedVideo._id,
        "Video uploaded."
      );
    }

    res
      .status(201)
      .json({ message: "Video uploaded successfully.", video: savedVideo });
  } catch (error) {
    if (publicId) {
      await deleteFromCloudinary(publicId).catch((delErr) =>
        console.error("Rollback failed:", delErr)
      );
    }

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.error(`[Controller] CRITICAL ERROR:`, error);
    res.status(500).json({ error: "Upload failed.", details: error.message });
  }
};

export const getVideoDetails = async (req, res) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId)
      .populate("ownerId", "username")
      .select("-publicId");

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    video.viewsCount = video.viewsCount + 1;
    video
      .save()
      .catch((err) => console.error("Failed to increment views:", err));

    return res.status(200).json({ video });
  } catch (error) {
    console.error("Error in getVideoDetails:", error);
    return res.status(500).json({ error: "Failed to retrieve video details." });
  }
};

export const getChannelVideos = async (req, res) => {
  const { channelId } = req.params;
  const {
    limit = 10,
    page = 1,
    sortBy = "createdAt",
    sortOrder = -1,
  } = req.query;

  try {
    const videos = await Video.find({
      channelId: channelId,
      videoStatus: "LIVE",
    })
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("title secureUrl duration viewsCount");

    return res.status(200).json({ videos });
  } catch (error) {
    console.error("Error in getChannelVideos:", error);
    return res
      .status(500)
      .json({ error: "Failed to retrieve channel videos." });
  }
};

export const updateVideoDetails = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  const { title, description, videoStatus } = req.body;

  if (!title && description === undefined && videoStatus === undefined) {
    return res
      .status(400)
      .json({ error: "Provide at least one field to update." });
  }

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    if (video.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this video." });
    }

    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (videoStatus) video.videoStatus = videoStatus;

    await video.save();

    return res
      .status(200)
      .json({ message: "Video updated successfully.", video });
  } catch (error) {
    console.error("Error in updateVideoDetails:", error);
    return res.status(500).json({ error: "Failed to update video details." });
  }
};

export const deleteVideo = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    if (video.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this video." });
    }

    const publicId = video.publicId;

    await Video.deleteOne({ _id: videoId });

    await deleteFromCloudinary(publicId).catch((err) => {
      console.error(
        `Failed to delete Cloudinary asset ${publicId} during cleanup:`,
        err
      );
    });

    return res.status(200).json({ message: "Video deleted successfully." });
  } catch (error) {
    console.error("Error in deleteVideo:", error);
    return res.status(500).json({ error: "Failed to delete video." });
  }
};
