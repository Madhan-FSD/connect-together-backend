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
      recentPosts: [],
      channels: [],
    };
  }

  const user = await User.findById(userId, {
    firstName: 1,
    lastName: 1,
    email: 1,
    role: 1,
    children: 1,
    avatar: 1,
    profileHeadline: 1,
    about: 1,
    dob: 1,
    skills: 1,
    certifications: 1,
    experiences: 1,
    educations: 1,
    interests: 1,
    achievements: 1,
    projects: 1,
  }).lean();

  if (!user) {
    return {
      user: null,
      children: [],
      recentPosts: [],
      channels: [],
    };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let role = (user.role || "NORMAL_USER").toUpperCase();

  if (
    Array.isArray(user.children) &&
    user.children.length > 0 &&
    role !== "PARENT"
  ) {
    role = "PARENT";
  }

  const userObjectId = user._id;

  let children = [];
  let recentPosts = [];
  let channels = [];

  try {
    if (role === "PARENT") {
      if (Array.isArray(user.children) && user.children.length) {
        children = user.children.map((child) => ({
          id: child._id,
          firstName: child.firstName || null,
          lastName: child.lastName || null,
          dob: child.dob || null,
          avatar: child.avatar || null,
          headline: child.headline || child.about || null,
        }));
      }

      const [posts, parentChannels] = await Promise.all([
        Post.find({
          ownerId: userObjectId,
          createdAt: { $gte: sevenDaysAgo },
        })
          .sort({ createdAt: -1 })
          .limit(25)
          .lean(),

        CuratedChannel.find({ ownerId: userObjectId }).lean(),
      ]);

      recentPosts = posts;
      channels = parentChannels;
    } else if (role === "CHILD") {
      const [childActivityLog, posts, childChannels] = await Promise.all([
        ActivityLog.find({
          childId: userObjectId,
          timestamp: { $gte: thirtyDaysAgo },
        })
          .sort({ timestamp: -1 })
          .limit(100)
          .lean(),

        Post.find({
          ownerId: userObjectId,
          createdAt: { $gte: sevenDaysAgo },
        })
          .sort({ createdAt: -1 })
          .limit(25)
          .lean(),

        CuratedChannel.find({ childId: userObjectId }).lean(),
      ]);

      recentPosts = posts;
      channels = childChannels;
      children = [];
    } else {
      const [posts, userChannels] = await Promise.all([
        Post.find({
          ownerId: userObjectId,
          createdAt: { $gte: sevenDaysAgo },
        })
          .sort({ createdAt: -1 })
          .limit(25)
          .lean(),

        CuratedChannel.find({ ownerId: userObjectId }).lean(),
      ]);

      recentPosts = posts;
      channels = userChannels;
      children = [];
    }
  } catch (err) {
    console.error("getComprehensiveDashboardData error:", err);
  }

  const counts = {
    skillsCount: (user.skills && user.skills.length) || 0,
    certificationsCount:
      (user.certifications && user.certifications.length) || 0,
    experiencesCount: (user.experiences && user.experiences.length) || 0,
    educationsCount: (user.educations && user.educations.length) || 0,
    interestsCount: (user.interests && user.interests.length) || 0,
    achievementsCount: (user.achievements && user.achievements.length) || 0,
    projectsCount: (user.projects && user.projects.length) || 0,
  };

  return {
    id: user._id,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    email: user.email || null,
    dob: user.dob || null,
    avatar: user.avatar || null,
    profileHeadline: user.profileHeadline || user.about || null,
    role,
    ...counts,
    children,
    recentPosts,
    channels,
  };
}
