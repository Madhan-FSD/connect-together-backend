import UserChannel from "../models/userchannel.model.js";
import ChildChannel from "../models/childchannel.model.js";
import { Post } from "../models/post.model.js";
import Video from "../models/video.model.js";
import Follower from "../models/follower.model.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import fs from "fs/promises";
import { logActivity } from "../utils/activityLog.js";
import mongoose from "mongoose";

const getChannelOwnerDetails = async (channelDoc) => {
  const ownerId = channelDoc.owner;
  if (!ownerId) return null;
  try {
    const owner = await User.findById(ownerId)
      .select("_id firstName lastName avatar")
      .lean();
    return owner;
  } catch {
    return null;
  }
};

const isOwnerOrParent = ({ channelDoc, requesterId }) => {
  if (!channelDoc || !requesterId) return { owner: false, parent: false };
  const req = requesterId.toString();
  const owner =
    (channelDoc.owner && channelDoc.owner.toString() === req) ||
    (channelDoc.childId && channelDoc.childId.toString() === req);
  const parent = channelDoc.parentId && channelDoc.parentId.toString() === req;
  return { owner, parent };
};

const isSubscriber = async (userId, channelDoc) => {
  if (!userId || !channelDoc) return false;
  const type = channelDoc.childId ? "CHILD_CHANNEL" : "USER_CHANNEL";
  return !!(await Follower.findOne({
    follower: userId,
    followedEntity: channelDoc._id,
    followedEntityType: type,
  }).lean());
};

const hasPaidAccess = async (userId, channelDoc) => {
  if (!userId || !channelDoc) return false;
  if (channelDoc.owner && userId.toString() === channelDoc.owner.toString())
    return true;
  if (
    channelDoc.parentId &&
    userId.toString() === channelDoc.parentId.toString()
  )
    return true;
  return false;
};

const redactPostForViewer = (postDoc) => {
  const p = postDoc.toObject ? postDoc.toObject() : { ...postDoc };
  delete p.mediaUrl;
  delete p.mediaPublicId;
  delete p.content;
  p.restricted = true;
  return p;
};

const redactVideoForViewer = (videoDoc) => {
  const v = { ...videoDoc };
  delete v.secureUrl;
  delete v.publicId;
  v.restricted = true;
  return v;
};

const cleanupFile = async (path) => {
  if (!path) return;
  await fs.unlink(path).catch(() => {});
};

const getFeaturedContentDetails = async (channel) => {
  if (!channel.featuredContent?.id) return null;
  const model = channel.featuredContent.type === "VIDEO" ? Video : Post;
  const select =
    channel.featuredContent.type === "VIDEO"
      ? "title description thumbnailUrl duration viewsCount"
      : "title content mediaUrl";
  const details = await model
    .findById(channel.featuredContent.id)
    .select(`_id type createdAt ${select}`)
    .lean();
  return details
    ? { ...details, contentType: channel.featuredContent.type }
    : null;
};

export const updateChannelVisibility = async (req, res) => {
  const { channelId } = req.params;
  const { visibility } = req.body;
  const userId = req.userId;

  if (
    !visibility ||
    !["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"].includes(visibility)
  ) {
    return res.status(400).json({ error: "Invalid visibility value." });
  }

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: userId,
    });
    if (!owner && !parent) {
      return res
        .status(403)
        .json({ error: "Only owner/parent can change visibility." });
    }

    channel.channelVisibility = visibility;
    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Visibility updated.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update visibility.", details: err.message });
  }
};

export const subscribeToChannel = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;
  if (!userId)
    return res.status(401).json({ error: "Login required to subscribe." });

  try {
    const channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const channelType = channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL";

    const existing = await Follower.findOne({
      follower: userId,
      followedEntity: channel._id,
      followedEntityType: channelType,
    });

    if (existing)
      return res.status(200).json({ message: "Already subscribed." });

    await Follower.create({
      follower: userId,
      followedEntity: channel._id,
      followedEntityType: channelType,
    });

    channel.subscribersCount = (channel.subscribersCount || 0) + 1;
    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(201).json({
      message: "Subscribed successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: "Already subscribed." });
    return res
      .status(500)
      .json({ error: "Failed to subscribe.", details: err.message });
  }
};

export const unsubscribeFromChannel = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;

  if (!userId)
    return res.status(401).json({ error: "Login required to unsubscribe." });

  try {
    const channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const channelType = channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL";

    const removed = await Follower.deleteOne({
      follower: userId,
      followedEntity: channel._id,
      followedEntityType: channelType,
    });

    if (removed.deletedCount === 0)
      return res.status(200).json({ message: "Was not subscribed." });

    channel.subscribersCount = Math.max(0, (channel.subscribersCount || 1) - 1);
    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Unsubscribed successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to unsubscribe.", details: err.message });
  }
};

export const getChannelSubscribers = async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const type = channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL";
    const skip = (page - 1) * limit;

    const subs = await Follower.find({
      followedEntity: channel._id,
      followedEntityType: type,
    })
      .skip(skip)
      .limit(Number(limit))
      .populate("follower", "firstName lastName avatar");

    const ownerDetails = await getChannelOwnerDetails(channel);
    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;

    return res.status(200).json({
      owner: ownerDetails,
      channel: obj,
      subscribers: subs,
      total: await Follower.countDocuments({
        followedEntity: channel._id,
        followedEntityType: type,
      }),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch subscribers." });
  }
};

export const getChannelPostsByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const viewerId = req.userId || null;

    let channel =
      (await UserChannel.findOne({ handle })) ||
      (await ChildChannel.findOne({ handle }));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: viewerId,
    });

    const subscribed = viewerId ? await isSubscriber(viewerId, channel) : false;
    const paid = viewerId ? await hasPaidAccess(viewerId, channel) : false;

    if (channel.channelVisibility === "PRIVATE" && !owner && !parent)
      return res.status(403).json({ error: "Channel is private." });

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      channelId: channel._id,
      postTarget: "CHANNEL",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("ownerId", "firstName lastName avatar")
      .lean();

    const final = posts.map((post) => {
      const isOwnerOrParentUser = owner || parent;

      let isAllowed = false;

      if (post.visibility === "PUBLIC") {
        isAllowed = true;
      } else if (post.visibility === "SUBSCRIBERS_ONLY") {
        isAllowed = subscribed || isOwnerOrParentUser;
      } else if (post.visibility === "PAID_ONLY") {
        isAllowed = paid || isOwnerOrParentUser;
      } else if (post.visibility === "PRIVATE") {
        isAllowed = isOwnerOrParentUser;
      }

      if (!isAllowed) return redactPostForViewer(post);

      return { ...post, restricted: false };
    });

    const total = await Post.countDocuments({
      channelId: channel._1,
      postTarget: "CHANNEL",
    });

    const featured = await getFeaturedContentDetails(channel);

    return res.status(200).json({
      owner: await getChannelOwnerDetails(channel),
      channel: { ...channel.toObject(), featuredContentDetails: featured },
      posts: final,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch posts." });
  }
};

export const getChannelVideosByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const viewerId = req.userId || null;

    let channel =
      (await UserChannel.findOne({ handle })) ||
      (await ChildChannel.findOne({ handle }));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: viewerId,
    });

    const subscribed = viewerId ? await isSubscriber(viewerId, channel) : false;
    const paid = viewerId ? await hasPaidAccess(viewerId, channel) : false;

    if (channel.channelVisibility === "PRIVATE" && !owner && !parent)
      return res.status(403).json({ error: "Channel is private." });

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const videos = await Video.find({
      channelId: channel._id,
      videoStatus: "LIVE",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const final = videos.map((video) => {
      const isOwnerOrParentUser = owner || parent;

      let isAllowed = false;

      if (video.visibility === "PUBLIC") {
        isAllowed = true;
      } else if (video.visibility === "SUBSCRIBERS_ONLY") {
        isAllowed = subscribed || isOwnerOrParentUser;
      } else if (video.visibility === "PAID_ONLY") {
        isAllowed = paid || isOwnerOrParentUser;
      } else if (video.visibility === "PRIVATE") {
        isAllowed = isOwnerOrParentUser;
      }

      if (!isAllowed) return redactVideoForViewer(video);

      return { ...video, restricted: false };
    });

    const total = await Video.countDocuments({
      channelId: channel._id,
      videoStatus: "LIVE",
    });

    const featured = await getFeaturedContentDetails(channel);

    return res.status(200).json({
      owner: await getChannelOwnerDetails(channel),
      channel: { ...channel.toObject(), featuredContentDetails: featured },
      videos: final,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch videos." });
  }
};

export const updateChannelAvatar = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;
  const file = req.file;

  if (!file)
    return res.status(400).json({ error: "Avatar image file is required." });

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) {
      await cleanupFile(file.path);
      return res.status(404).json({ error: "Channel not found." });
    }

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: userId,
    });

    if (!owner && !parent) {
      await cleanupFile(file.path);
      return res.status(403).json({
        error: "Not authorized to update channel avatar.",
      });
    }

    const folder = channel.childId
      ? `channels/${channel.parentId}/${channel.childId}/avatar`
      : `channels/${channel.owner}/avatar`;

    const result = await uploadOnCloudinary(file.path, folder);
    if (!result) {
      await cleanupFile(file.path);
      return res.status(500).json({ error: "Avatar upload failed." });
    }

    if (channel.avatarPublicId)
      await deleteFromCloudinary(channel.avatarPublicId).catch(() => {});

    channel.avatarUrl = result.secure_url;
    channel.avatarPublicId = result.public_id;

    await channel.save();
    await cleanupFile(file.path);

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Channel avatar updated successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    await cleanupFile(req.file?.path || "");
    return res.status(500).json({
      error: "Failed to update channel avatar.",
      details: err.message,
    });
  }
};

export const updateChannelBanner = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;
  const file = req.file;

  if (!file)
    return res.status(400).json({ error: "Banner image file is required." });

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) {
      await cleanupFile(file.path);
      return res.status(404).json({ error: "Channel not found." });
    }

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: userId,
    });

    if (!owner && !parent) {
      await cleanupFile(file.path);
      return res.status(403).json({
        error: "Not authorized to update channel banner.",
      });
    }

    const folder = channel.childId
      ? `channels/${channel.parentId}/${channel.childId}/banner`
      : `channels/${channel.owner}/banner`;

    const result = await uploadOnCloudinary(file.path, folder);
    if (!result) {
      await cleanupFile(file.path);
      return res.status(500).json({ error: "Banner upload failed." });
    }

    if (channel.bannerPublicId)
      await deleteFromCloudinary(channel.bannerPublicId).catch(() => {});

    channel.bannerUrl = result.secure_url;
    channel.bannerPublicId = result.public_id;

    await channel.save();
    await cleanupFile(file.path);

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Channel banner updated successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    await cleanupFile(req.file?.path || "");
    return res.status(500).json({
      error: "Failed to update channel banner.",
      details: err.message,
    });
  }
};

export const getChannelAnalytics = async (req, res) => {
  try {
    const { channelId } = req.params;

    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: req.userId,
    });

    if (!owner && !parent)
      return res.status(403).json({
        error: "Only owner / parent can view analytics.",
      });

    const ref = channel._id;

    const posts = await Post.aggregate([
      { $match: { channelId: ref, postTarget: "CHANNEL" } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalPostLikes: { $sum: "$likesCount" },
          totalPostComments: { $sum: "$commentsCount" },
        },
      },
    ]);

    const videos = await Video.aggregate([
      { $match: { channelId: ref, videoStatus: "LIVE" } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalVideoLikes: { $sum: "$likesCount" },
          totalVideoComments: { $sum: "$commentsCount" },
          totalViews: { $sum: "$viewsCount" },
        },
      },
    ]);

    const subscriberCount = await Follower.countDocuments({
      followedEntity: ref,
      followedEntityType: channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL",
    });

    const analytics = {
      subscribers: subscriberCount,
      posts: posts.length ? posts[0].totalPosts : 0,
      videos: videos.length ? videos[0].totalVideos : 0,
      likes:
        (posts[0]?.totalPostLikes || 0) + (videos[0]?.totalVideoLikes || 0),
      comments:
        (posts[0]?.totalPostComments || 0) +
        (videos[0]?.totalVideoComments || 0),
      views: videos[0]?.totalViews || 0,
    };

    const ownerDetails = await getChannelOwnerDetails(channel);
    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;

    return res.status(200).json({
      owner: ownerDetails,
      channel: obj,
      analytics,
    });
  } catch {
    return res
      .status(500)
      .json({ error: "Failed to fetch channel analytics." });
  }
};

export const createNormalUserChannel = async (req, res) => {
  const userId = req.userId;
  console.log("userid", userId);
  const { name, handle, description } = req.body;

  const avatarFile = req.files?.avatar?.[0] || null;
  const bannerFile = req.files?.banner?.[0] || null;

  if (!name || !handle)
    return res.status(400).json({ error: "Channel name and handle required." });

  try {
    let avatarUrl = null;
    let bannerUrl = null;
    let avatarPublicId = null;
    let bannerPublicId = null;

    if (avatarFile) {
      const uploaded = await uploadOnCloudinary(
        avatarFile.path,
        `channels/${userId}/avatar`
      );
      if (!uploaded) throw new Error("Avatar upload failed");
      avatarUrl = uploaded.secure_url;
      avatarPublicId = uploaded.public_id;
      await fs.unlink(avatarFile.path).catch(() => {});
    }

    if (bannerFile) {
      const uploaded = await uploadOnCloudinary(
        bannerFile.path,
        `channels/${userId}/banner`
      );
      if (!uploaded) throw new Error("Banner upload failed");
      bannerUrl = uploaded.secure_url;
      bannerPublicId = uploaded.public_id;
      await fs.unlink(bannerFile.path).catch(() => {});
    }

    const norm = handle.toLowerCase();
    const conflict = await UserChannel.findOne({ handle: norm }).lean();
    const childConflict = await ChildChannel.findOne({ handle: norm }).lean();

    if (conflict || childConflict) {
      return res.status(409).json({ error: "Handle already in use." });
    }

    const channel = await UserChannel.create({
      owner: userId,
      name,
      handle: norm,
      description: description || "",
      avatarUrl,
      bannerUrl,
      avatarPublicId,
      bannerPublicId,
    });

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(201).json({
      message: "User channel created successfully",
      owner: ownerDetails,
      channel: obj,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to create or update channel",
      details: err.message,
    });
  }
};

export const getChannelDetails = async (req, res) => {
  const { channelId } = req.params;
  const viewerId = req.userId || null;

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    let isSubscribed = false;
    if (viewerId) isSubscribed = await isSubscriber(viewerId, channel);

    const ownerDetails = await getChannelOwnerDetails(channel);
    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;

    return res.status(200).json({
      owner: ownerDetails,
      channel: obj,
      channelType: channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL",
      isSubscribed,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch channel." });
  }
};

export const updateChannelDetails = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const {
    name,
    handle,
    description,
    channelVisibility,
    uploadPermission,
    uploadTimeWindow,
    commentModeration,
    likeVisibility,
  } = req.body;

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId,
    });
    if (!owner && !parent)
      return res.status(403).json({ error: "Unauthorized to update channel." });

    if (handle) {
      const norm = handle.toLowerCase();
      const conflict = await UserChannel.findOne({
        handle: norm,
        _id: { $ne: channel._id },
      }).lean();
      const childConflict = await ChildChannel.findOne({
        handle: norm,
        _id: { $ne: channel._id },
      }).lean();

      if (conflict || childConflict)
        return res.status(409).json({ error: "Handle already in use." });

      channel.handle = norm;
    }

    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (
      channelVisibility &&
      ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"].includes(
        channelVisibility
      )
    ) {
      channel.channelVisibility = channelVisibility;
    }

    if (channel.childId) {
      if (
        uploadPermission &&
        ["FULL", "BLOCKED", "LIMITED"].includes(uploadPermission)
      )
        channel.uploadPermission = uploadPermission;
      if (uploadTimeWindow !== undefined)
        channel.uploadTimeWindow = uploadTimeWindow;
      if (commentModeration !== undefined)
        channel.commentModeration = Boolean(commentModeration);
      if (
        likeVisibility &&
        ["PUBLIC_COUNT", "PRIVATE_COUNT", "DISABLED"].includes(likeVisibility)
      )
        channel.likeVisibility = likeVisibility;
    }

    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Channel updated successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch {
    return res.status(500).json({ error: "Failed to update channel." });
  }
};

export const deleteChannel = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;

  try {
    const channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId,
    });
    if (!owner && !parent)
      return res.status(403).json({ error: "Unauthorized to delete channel." });

    try {
      if (channel.avatarPublicId)
        await deleteFromCloudinary(channel.avatarPublicId).catch(() => {});
      if (channel.bannerPublicId)
        await deleteFromCloudinary(channel.bannerPublicId).catch(() => {});
    } catch {}

    const ref = channel._id;

    const posts = await Post.find({
      channelId: ref,
      postTarget: "CHANNEL",
    }).lean();
    const videos = await Video.find({ channelId: ref }).lean();

    const deletePromises = [];

    for (const p of posts) {
      if (p.mediaPublicId)
        deletePromises.push(
          deleteFromCloudinary(p.mediaPublicId).catch(() => {})
        );
    }

    for (const v of videos) {
      if (v.publicId)
        deletePromises.push(deleteFromCloudinary(v.publicId).catch(() => {}));
    }

    await Promise.all(deletePromises).catch(() => {});

    const ops = [
      Post.deleteMany({ channelId: ref, postTarget: "CHANNEL" }),
      Video.deleteMany({ channelId: ref }),
      Follower.deleteMany({ followedEntity: ref }),
    ];

    try {
      const Playlist = (await import("../models/playlist.model.js")).default;
      delete ops.push(Playlist.deleteMany({ channelId: ref }));
    } catch {}

    await Promise.all(ops);
    await channel.deleteOne();

    await logActivity(
      "DELETED_CHANNEL",
      channel.owner || channel.parentId,
      requesterId,
      null,
      ref,
      `Channel deleted: ${channel.name || channel.handle}`
    ).catch(() => {});

    return res.status(200).json({ message: "Channel deleted successfully." });
  } catch {
    return res.status(500).json({ error: "Failed to delete channel." });
  }
};

export const getChannelDetailsByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const viewerId = req.userId || null;
    const isAuth = !!viewerId;

    let channel = await UserChannel.findOne({ handle });
    if (!channel) channel = await ChildChannel.findOne({ handle });
    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const ownerDetails = await getChannelOwnerDetails(channel);

    let isSubscribed = false;
    if (isAuth) isSubscribed = await isSubscriber(viewerId, channel);

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: viewerId,
    });

    if (channel.channelVisibility === "PRIVATE" && !owner && !parent)
      return res.status(403).json({ error: "Channel is private." });

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;

    return res.status(200).json({
      owner: ownerDetails,
      channel: obj,
      channelType: channel.childId ? "CHILD_CHANNEL" : "USER_CHANNEL",
      isSubscribed,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch channel details." });
  }
};

export const getChannelSubscriberCount = async (req, res) => {
  const { channelId } = req.params;

  try {
    const channel =
      (await UserChannel.findById(channelId).select("subscribersCount")) ||
      (await ChildChannel.findById(channelId).select("subscribersCount"));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    return res.status(200).json({
      subscribersCount: channel.subscribersCount,
      channelId,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch count." });
  }
};

export const checkSubscriptionStatus = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;

  try {
    const channel =
      (await UserChannel.findById(channelId).select("_id")) ||
      (await ChildChannel.findById(channelId).select("_id"));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const isSubscribed = await isSubscriber(userId, channel);

    return res.status(200).json({
      channelId,
      isSubscribed,
    });
  } catch {
    return res
      .status(500)
      .json({ error: "Failed to check subscription status." });
  }
};

export const getPersonalChannelFeed = async (req, res) => {
  const userId = req.userId;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const followedChannels = await Follower.find({
      follower: userId,
      followedEntityType: { $in: ["USER_CHANNEL", "CHILD_CHANNEL"] },
    })
      .select("followedEntity")
      .lean();

    const ids = followedChannels.map((f) => f.followedEntity);

    if (ids.length === 0)
      return res.status(200).json({
        posts: [],
        videos: [],
        message: "Follow more channels to see content here.",
      });

    const postQuery = Post.find({
      channelId: { $in: ids },
      visibility: { $in: ["PUBLIC", "SUBSCRIBERS_ONLY"] },
      postTarget: "CHANNEL",
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .populate({ path: "ownerId", select: "firstName lastName avatar" })
      .lean();

    const [posts, total] = await Promise.all([
      postQuery,
      Post.countDocuments({
        channelId: { $in: ids },
        postTarget: "CHANNEL",
      }),
    ]);

    return res.status(200).json({
      feed: posts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch feed." });
  }
};

export const updateChannelPermissions = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const {
    uploadPermission,
    uploadTimeWindow,
    commentModeration,
    likeVisibility,
  } = req.body;

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId,
    });
    if (!owner && !parent)
      return res
        .status(403)
        .json({ error: "Unauthorized to update channel permissions." });

    if (channel.childId) {
      if (
        uploadPermission &&
        ["FULL", "BLOCKED", "LIMITED"].includes(uploadPermission)
      )
        channel.uploadPermission = uploadPermission;
      if (uploadTimeWindow !== undefined)
        channel.uploadTimeWindow = uploadTimeWindow;
      if (commentModeration !== undefined)
        channel.commentModeration = Boolean(commentModeration);
      if (
        likeVisibility &&
        ["PUBLIC_COUNT", "PRIVATE_COUNT", "DISABLED"].includes(likeVisibility)
      )
        channel.likeVisibility = likeVisibility;
    } else {
      return res
        .status(400)
        .json({ error: "Permissions are only applicable to child channels." });
    }

    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Channel permissions updated successfully.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch {
    return res.status(500).json({ error: "Failed to update permissions." });
  }
};

export const updateChannelFeaturedContent = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const { featuredContentType, featuredContentId } = req.body;

  if (featuredContentId && !mongoose.Types.ObjectId.isValid(featuredContentId))
    return res.status(400).json({ error: "Invalid content ID." });

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId,
    });
    if (!owner && !parent)
      return res
        .status(403)
        .json({ error: "Unauthorized to update featured content." });

    if (featuredContentId) {
      const model = featuredContentType === "VIDEO" ? Video : Post;
      const content = await model
        .findOne({ _id: featuredContentId, channelId: channel._id })
        .lean();
      if (!content)
        return res.status(404).json({
          error:
            "Featured content not found or does not belong to this channel.",
        });

      channel.featuredContent = {
        type: featuredContentType,
        id: featuredContentId,
      };
    } else {
      channel.featuredContent = null;
    }

    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: featuredContentId
        ? "Featured content set."
        : "Featured content cleared.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch {
    return res
      .status(500)
      .json({ error: "Failed to update featured content." });
  }
};

export const searchAllChannels = async (req, res) => {
  const { q } = req.query;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!q || q.trim() === "")
    return res.status(400).json({ error: "Search query 'q' is required." });

  try {
    const searchRegex = new RegExp(q, "i");

    const cond = {
      $or: [
        { name: { $regex: searchRegex } },
        { handle: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ],
      channelVisibility: "PUBLIC",
    };

    const userChannels = await UserChannel.find(cond)
      .select("name handle avatarUrl subscribersCount")
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const totalUser = await UserChannel.countDocuments(cond);
    const totalChild = await ChildChannel.countDocuments(cond);
    const total = totalUser + totalChild;

    let channels = userChannels;
    if (userChannels.length < limit) {
      const childChannels = await ChildChannel.find(cond)
        .select("name handle avatarUrl subscribersCount parentId")
        .limit(Number(limit) - userChannels.length)
        .lean();
      channels = [...userChannels, ...childChannels];
    }

    return res.status(200).json({
      channels,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to search channels." });
  }
};

export const getChannelUploadHistory = async (req, res) => {
  const { channelId } = req.params;
  const requesterId = req.userId;
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId,
    });
    if (!owner && !parent)
      return res.status(403).json({
        error: "Only owner/parent can view upload history.",
      });

    const ref = channel._id;

    const posts = await Post.find({
      channelId: ref,
      postTarget: "CHANNEL",
    })
      .select(
        "title content mediaUrl createdAt likesCount commentsCount visibility"
      )
      .lean();

    const videos = await Video.find({ channelId: ref })
      .select(
        "title description thumbnailUrl secureUrl createdAt likesCount commentsCount viewsCount visibility"
      )
      .lean();

    const combined = [
      ...posts.map((p) => ({ ...p, type: "POST" })),
      ...videos.map((v) => ({ ...v, type: "VIDEO" })),
    ];

    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginated = combined.slice(skip, skip + Number(limit));
    const total = combined.length;

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      owner: ownerDetails,
      channel: obj,
      history: paginated,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch upload history." });
  }
};

export const deleteChannelAvatar = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;

  try {
    let channel =
      (await UserChannel.findById(channelId)) ||
      (await ChildChannel.findById(channelId));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    const { owner, parent } = isOwnerOrParent({
      channelDoc: channel,
      requesterId: userId,
    });
    if (!owner && !parent)
      return res
        .status(403)
        .json({ error: "Not authorized to delete channel avatar." });

    const pid = channel.avatarPublicId;

    if (!pid)
      return res.status(200).json({
        message: "No avatar to delete. Already using default.",
      });

    await deleteFromCloudinary(pid).catch(() => {});
    channel.avatarUrl = "";
    channel.avatarPublicId = null;

    await channel.save();

    const featured = await getFeaturedContentDetails(channel);
    const obj = channel.toObject();
    obj.featuredContentDetails = featured;
    const ownerDetails = await getChannelOwnerDetails(channel);

    return res.status(200).json({
      message: "Channel avatar deleted successfully. Using default.",
      owner: ownerDetails,
      channel: obj,
    });
  } catch {
    return res.status(500).json({ error: "Failed to delete channel avatar." });
  }
};

export const reportChannel = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId;
  const { reason, details } = req.body;

  if (!reason)
    return res.status(400).json({ error: "A report reason is required." });

  try {
    const channel =
      (await UserChannel.findById(channelId).select("name handle")) ||
      (await ChildChannel.findById(channelId).select("name handle"));

    if (!channel) return res.status(404).json({ error: "Channel not found." });

    await Report.create({
      reporterId: userId,
      entityId: channel._id,
      entityType: "CHANNEL",
      reason,
      details,
      status: "PENDING",
    });

    return res.status(201).json({
      message: "Channel successfully reported. Thank you for your feedback.",
    });
  } catch {
    return res.status(500).json({ error: "Failed to submit report." });
  }
};
