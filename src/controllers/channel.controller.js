import fs from "fs/promises";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import UserChannel from "../models/userchannel.model.js";
import Follower from "../models/follower.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { logActivity } from "../utils/activityLog.js";
import { getChildName } from "../utils/child.utils.js";
import ChildChannel from "../models/childchannel.model.js";

const cleanupFile = async (filePath) => {
  if (filePath) await fs.unlink(filePath).catch(() => {});
};

const handleFileUpload = async (file, folder) => {
  if (!file) return null;
  const result = await uploadOnCloudinary(file.path, folder);
  await cleanupFile(file.path);
  if (!result) throw new Error("File upload failed.");
  return result;
};

const getChannelModelAndVerifyOwner = async (channelId, requesterId) => {
  const id = new mongoose.Types.ObjectId(channelId);

  let model = UserChannel;
  let channel = await UserChannel.findById(id);
  let requesterIsOwner = false;
  let requesterIsParent = false;

  if (channel) {
    requesterIsOwner = channel.userId.toString() === requesterId.toString();
  } else {
    channel = await ChildChannel.findById(id);
    model = ChildChannel;
    if (channel) {
      requesterIsOwner = channel.childId.toString() === requesterId.toString();
      requesterIsParent =
        channel.parentId.toString() === requesterId.toString();
    }
  }

  if (!channel) throw new Error("Channel not found or unauthorized access.");
  return { model, channel, requesterIsOwner, requesterIsParent };
};

export const createUserChannel = async (req, res) => {
  const userId = req.userId;
  const { name, handle, description } = req.body;

  const avatarFile = req.files?.avatar?.[0];
  const bannerFile = req.files?.banner?.[0];
  const filesToCleanup = [];

  if (!name || !handle)
    return res.status(400).json({ error: "Channel name and handle required." });

  try {
    let avatarUrl, bannerUrl;

    if (avatarFile) {
      const result = await handleFileUpload(
        avatarFile,
        `users/${userId}/avatars`
      );
      avatarUrl = result.secure_url;
      filesToCleanup.push(result.public_id);
    }
    if (bannerFile) {
      const result = await handleFileUpload(
        bannerFile,
        `users/${userId}/banners`
      );
      bannerUrl = result.secure_url;
      filesToCleanup.push(result.public_id);
    }

    let channel = await UserChannel.findOne({ userId });
    if (channel) {
      channel.name = name;
      channel.handle = handle;
      channel.description = description;
      if (avatarUrl) channel.avatarUrl = avatarUrl;
      if (bannerUrl) channel.bannerUrl = bannerUrl;
      await channel.save();
    } else {
      channel = await UserChannel.create({
        userId,
        name,
        handle,
        description,
        avatarUrl,
        bannerUrl,
      });
    }

    res.status(200).json({
      message: "User channel created/updated successfully",
      channel,
    });
  } catch (err) {
    for (const id of filesToCleanup)
      await deleteFromCloudinary(id).catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const createChildChannel = async (req, res) => {
  const childId = req.userId;
  const parentId = req.parentId;
  const { name, handle, description } = req.body;
  const avatarFile = req.files?.avatar?.[0];
  const bannerFile = req.files?.banner?.[0];
  const filesToCleanup = [];

  if (!parentId)
    return res.status(401).json({ error: "Parent ID missing in token." });

  if (!name || !handle)
    return res.status(400).json({ error: "Channel name and handle required." });

  try {
    let avatarUrl, bannerUrl;

    if (avatarFile) {
      const result = await handleFileUpload(
        avatarFile,
        `children/${childId}/avatars`
      );
      avatarUrl = result.secure_url;
      filesToCleanup.push(result.public_id);
    }
    if (bannerFile) {
      const result = await handleFileUpload(
        bannerFile,
        `children/${childId}/banners`
      );
      bannerUrl = result.secure_url;
      filesToCleanup.push(result.public_id);
    }

    let channel = await ChildChannel.findOne({ childId });
    if (channel) {
      channel.name = name;
      channel.handle = handle;
      channel.description = description;
      if (avatarUrl) channel.avatarUrl = avatarUrl;
      if (bannerUrl) channel.bannerUrl = bannerUrl;
      await channel.save();
      return res
        .status(200)
        .json({ message: "Child channel updated.", channel });
    }

    const childName = await getChildName(childId);
    const newChannel = await ChildChannel.create({
      parentId,
      childId,
      name,
      handle,
      description,
      avatarUrl,
      bannerUrl,
    });

    await logActivity(
      "CREATED_CHANNEL",
      parentId,
      childId,
      childName,
      newChannel._id,
      `Created new channel: ${name}`
    );

    res.status(201).json({
      message: "Child channel created successfully",
      channel: newChannel,
    });
  } catch (err) {
    for (const id of filesToCleanup)
      await deleteFromCloudinary(id).catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const updateChannelDetails = async (req, res) => {
  const { channelId } = req.params;
  const { name, description } = req.body;
  const requesterId = req.userId;

  if (!name && !description)
    return res.status(400).json({ error: "Nothing to update." });

  try {
    const { model, channel, requesterIsOwner, requesterIsParent } =
      await getChannelModelAndVerifyOwner(channelId, requesterId);

    if (model === UserChannel && !requesterIsOwner)
      return res.status(403).json({ error: "Only owner can update channel." });
    if (model === ChildChannel && !requesterIsParent)
      return res
        .status(403)
        .json({ error: "Only parent can update child channel." });

    if (name) channel.name = name;
    if (description) channel.description = description;
    await channel.save();
    res.status(200).json({ message: "Channel updated successfully.", channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateChannelAvatar = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "Avatar file required." });

  try {
    const { model, channel, requesterIsOwner, requesterIsParent } =
      await getChannelModelAndVerifyOwner(channelId, requesterId);

    if (
      (model === UserChannel && !requesterIsOwner) ||
      (model === ChildChannel && !requesterIsParent)
    )
      return res.status(403).json({ error: "Unauthorized." });

    const folder = channel.childId
      ? `channels/${channel.parentId}/${channel.childId}`
      : `channels/${requesterId}`;
    const result = await handleFileUpload(file, folder);
    if (channel.avatarPublicId)
      await deleteFromCloudinary(channel.avatarPublicId);

    channel.avatarUrl = result.secure_url;
    channel.avatarPublicId = result.public_id;
    await channel.save();

    res.status(200).json({ message: "Avatar updated.", channel });
  } catch (err) {
    await cleanupFile(file?.path);
    res.status(500).json({ error: err.message });
  }
};

export const updateChannelBanner = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "Banner file required." });

  try {
    const { model, channel, requesterIsOwner, requesterIsParent } =
      await getChannelModelAndVerifyOwner(channelId, requesterId);

    if (
      (model === UserChannel && !requesterIsOwner) ||
      (model === ChildChannel && !requesterIsParent)
    )
      return res.status(403).json({ error: "Unauthorized." });

    const folder = channel.childId
      ? `channels/${channel.userId}/${channel.childId}`
      : `channels/${requesterId}`;
    const result = await handleFileUpload(file, folder);
    if (channel.bannerPublicId)
      await deleteFromCloudinary(channel.bannerPublicId);

    channel.bannerUrl = result.secure_url;
    channel.bannerPublicId = result.public_id;
    await channel.save();

    res.status(200).json({ message: "Banner updated.", channel });
  } catch (err) {
    await cleanupFile(file?.path);
    res.status(500).json({ error: err.message });
  }
};

export const deleteChannel = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;

  try {
    const { channel, model, requesterIsOwner, requesterIsParent } =
      await getChannelModelAndVerifyOwner(channelId, requesterId);

    if (
      (model === UserChannel && !requesterIsOwner) ||
      (model === ChildChannel && !requesterIsParent)
    )
      return res.status(403).json({ error: "Unauthorized to delete channel." });

    if (channel.avatarPublicId)
      await deleteFromCloudinary(channel.avatarPublicId);
    if (channel.bannerPublicId)
      await deleteFromCloudinary(channel.bannerPublicId);
    await channel.deleteOne();

    res.status(200).json({ message: "Channel deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserOwnChannel = async (req, res) => {
  try {
    const channel = await UserChannel.findOne({ userId: req.userId });
    if (!channel) return res.status(404).json({ error: "No channel found." });
    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChildOwnChannel = async (req, res) => {
  try {
    const channel = await ChildChannel.findOne({ childId: req.params.childId });
    if (!channel) return res.status(404).json({ error: "No channel found." });
    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChannelByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    let channel = await UserChannel.findOne({ handle });
    let channelType = "USER_CHANNEL";
    if (!channel) {
      channel = await ChildChannel.findOne({ handle });
      channelType = "CHILD_CHANNEL";
    }
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    let isSubscribed = false;
    if (req.userId) {
      const sub = await Follower.findOne({
        follower: req.userId,
        followedEntity: channel._id,
        followedEntityType: channelType,
      });
      isSubscribed = !!sub;
    }

    res.json({ channel, channelType, isSubscribed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChannelPosts = async (req, res) => {
  try {
    const { handle } = req.params;
    const { page = 1, limit = 20 } = req.query;

    let channel =
      (await UserChannel.findOne({ handle })) ||
      (await ChildChannel.findOne({ handle }));
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const posts = await Post.find({
      channelId: channel._id,
      postTarget: "CHANNEL",
    })
      .sort("-createdAt")
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const count = await Post.countDocuments({
      channelId: channel._id,
      postTarget: "CHANNEL",
    });

    res.json({
      posts,
      totalPages: Math.ceil(count / limit),
      totalPosts: count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChannelVideos = async (req, res) => {
  try {
    const { handle } = req.params;
    const { page = 1, limit = 20 } = req.query;

    let channel =
      (await UserChannel.findOne({ handle })) ||
      (await ChildChannel.findOne({ handle }));
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const videos = await Post.find({
      channelId: channel._id,
      postTarget: "CHANNEL",
      contentType: "VIDEO",
    })
      .sort("-createdAt")
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const count = await Post.countDocuments({
      channelId: channel._id,
      postTarget: "CHANNEL",
      contentType: "VIDEO",
    });

    res.json({
      videos,
      totalPages: Math.ceil(count / limit),
      totalVideos: count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChannelAnalytics = async (req, res) => {
  try {
    const channel = await UserChannel.findOne({ userId: req.userId });
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const videoStats = await Post.aggregate([
      { $match: { channelId: channel._id, contentType: "VIDEO" } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
          totalLikes: { $sum: "$likeCount" },
          totalComments: { $sum: "$commentsCount" },
          videoCount: { $sum: 1 },
        },
      },
    ]);

    const subscriberCount = await Follower.countDocuments({
      followedEntity: channel._id,
      followedEntityType: "USER_CHANNEL",
    });

    res.json({
      analytics: {
        subscriberCount,
        videoCount: videoStats[0]?.videoCount || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalComments: videoStats[0]?.totalComments || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const searchChannels = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    if (!query)
      return res.status(400).json({ error: "Search query required." });
    const regex = new RegExp(query, "i");

    const users = await UserChannel.find({
      $or: [{ name: regex }, { handle: regex }, { description: regex }],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const children = await ChildChannel.find({
      $or: [{ name: regex }, { handle: regex }, { description: regex }],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const results = [
      ...users.map((c) => ({ ...c.toObject(), type: "USER_CHANNEL" })),
      ...children.map((c) => ({ ...c.toObject(), type: "CHILD_CHANNEL" })),
    ];

    res.json({ channels: results, totalResults: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
