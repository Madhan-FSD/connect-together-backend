import { User } from "../models/user.model.js";
import ActivityLog from "../models/activitylog.model.js";
import { Post } from "../models/post.model.js";
import CuratedChannel from "../models/curatedchannel.model.js";
import mongoose from "mongoose";

/**
 * Fetches all necessary dashboard data for a user and their children.
 * The function name should ideally be updated (e.g., getuserDashboardData).
 * @param {string} userId - The MongoDB ID of the user document.
 * @returns {object} { user, children, activityLog, latestPosts, channels }
 */
export async function getComprehensiveDashboardData(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      user: null,
      children: [],
      activityLog: [],
      latestPosts: [],
      channels: [],
    };
  }

  const user = await User.findById(userId, {
    name: 1,
    email: 1,
    children: 1,
  }).lean();

  if (!user) {
    return {
      user: null,
      children: [],
      activityLog: [],
      latestPosts: [],
      channels: [],
    };
  }

  const childIds = user.children.map((child) => child._id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [activityLog, latestPosts, channels] = await Promise.all([
    ActivityLog.find({
      childId: { $in: childIds },
      timestamp: { $gte: thirtyDaysAgo },
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean(),

    Post.find({
      ownerId: { $in: childIds },
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),

    CuratedChannel.find({
      childId: { $in: childIds },
    }).lean(),
  ]);

  return {
    user: {
      id: user._id,
      name: user.name || "User",
      email: user.email || null,
    },
    children: user.children.map((child) => ({
      id: child._id,
      name: child.name,
      age: child.age,
      permissions: child.permissions,
    })),
    activityLog,
    latestPosts,
    channels,
  };
}
