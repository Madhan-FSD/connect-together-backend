import { Post } from "../models/post.model.js";
import Connection from "../models/connections.model.js";
import Follower from "../models/follower.model.js";
import mongoose from "mongoose";

export const getPersonalizedFeed = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: "ACCEPTED" },
        { recipient: userId, status: "ACCEPTED" },
      ],
    });

    const connectedUserIds = connections.map((conn) => {
      return conn.requester.toString() === userId
        ? conn.recipient
        : conn.requester;
    });

    const followedChannels = await Follower.find({ follower: userId });

    const followedChannelIds = followedChannels.map((f) => f.followedEntity);

    const query = {
      $or: [
        { ownerId: userId },

        {
          ownerId: { $in: connectedUserIds },
          postTarget: "PROFILE",
        },

        {
          channelId: { $in: followedChannelIds },
          postTarget: "CHANNEL",
        },
      ],
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("ownerId", "firstName lastName email avatar")
      .populate("channelId", "name handle avatarUrl")
      .lean();

    const totalPosts = await Post.countDocuments(query);

    const postsWithMetrics = posts.map((post) => ({
      ...post,
      isOwn: post.ownerId._id.toString() === userId,
    }));

    return res.status(200).json({
      posts: postsWithMetrics,
      pagination: {
        total: totalPosts,
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching personalized feed:", error);
    return res.status(500).json({
      error: "Failed to fetch feed.",
      details: error.message,
    });
  }
};

export const getExploreFeed = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "ACCEPTED",
    });

    const connectedUserIds = connections.map((conn) => {
      return conn.requester.toString() === userId
        ? conn.recipient
        : conn.requester;
    });

    const query = {
      ownerId: {
        $nin: [...connectedUserIds, new mongoose.Types.ObjectId(userId)],
      },
      postTarget: "PROFILE",
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1, likeCount: -1 })
      .skip(skip)
      .limit(limit)
      .populate("ownerId", "firstName lastName email avatar")
      .lean();

    const totalPosts = await Post.countDocuments(query);

    return res.status(200).json({
      posts,
      pagination: {
        total: totalPosts,
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching explore feed:", error);
    return res.status(500).json({
      error: "Failed to fetch explore feed.",
      details: error.message,
    });
  }
};

export const getTrendingPosts = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await Post.find({
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ likeCount: -1, commentsCount: -1 })
      .limit(limit)
      .populate({
        path: "ownerId",
        select: "firstName lastName email avatar",
      })
      .populate({
        path: "channelId",
        select: "name handle avatarUrl",
      })
      .lean();

    const postsWithExtras = posts.map((post) => ({
      ...post,
      isTrending: true,
    }));

    return res.status(200).json({ posts: postsWithExtras });
  } catch (error) {
    console.error("Error fetching trending posts:", error);
    return res.status(500).json({ error: "Failed to fetch trending posts." });
  }
};
