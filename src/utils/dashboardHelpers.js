import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import ChildChannel from "../models/childchannel.model.js";
import CuratedChannel from "../models/curatedchannel.model.js";
import { Post } from "../models/post.model.js";
import UserChannel from "../models/userchannel.model.js";
import GameSession from "../models/gamesession.model.js";

export async function getChildProfileSummary(childId) {
  if (!mongoose.Types.ObjectId.isValid(childId)) return null;

  const childObjectId = new mongoose.Types.ObjectId(childId);

  const parent = await User.findOne(
    { "children._id": childObjectId },
    { "children.$": 1 }
  ).lean();

  if (!parent || !parent.children?.length) return null;

  const childDoc = parent.children[0];
  return extractChildSummary(childDoc);
}

export async function getUserProfileSummary(userId) {
  const objectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const pipeline = [
    { $match: { _id: objectId } },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        mobile: 1,
        dob: 1,
        profileHeadline: 1,
        about: 1,
        skillsCount: { $size: "$skills" },
        certificationsCount: { $size: "$certifications" },
        experiencesCount: { $size: "$experiences" },
        educationsCount: { $size: "$educations" },
        interestsCount: { $size: "$interests" },
        achievementsCount: { $size: "$achievements" },
        projectsCount: { $size: "$projects" },
      },
    },
  ];

  const results = await User.aggregate(pipeline);
  return results[0] || null;
}

function extractChildSummary(childDoc) {
  if (!childDoc) return null;

  const coreDetailsAndProfileCounts = {
    _id: childDoc._id,
    firstName: childDoc.firstName,
    lastName: childDoc.lastName,
    gender: childDoc.gender,
    dob: childDoc.dob,
    about: childDoc.about,
    avatar: childDoc.avatar,
    interestsCount: childDoc.interests?.length || 0,
    skillsCount: childDoc.skills?.length || 0,
    certificationsCount: childDoc.certifications?.length || 0,
    achievementsCount: childDoc.achievements?.length || 0,
    projectsCount: childDoc.projects?.length || 0,
    educationsCount: childDoc.educations?.length || 0,
    activitiesCount: childDoc.activities?.length || 0,
    insightsCount: childDoc.insights?.length || 0,
  };

  return { ...coreDetailsAndProfileCounts };
}

/**
 * CORE HELPER 3: Fetches social content activity based on the user's role.
 * Uses different models for CHILD vs. NORMAL_USER/PARENT.
 */
async function getSocialActivitySummary(userId, role) {
  let recentPosts = [];
  let userChannel = null;
  let curatedContent = null;

  if (role === "CHILD") {
    userChannel = await ChildChannel.findOne({ childId: userId })
      .select(
        "name handle subscribersCount totalLikes videoCount uploadPermission"
      )
      .lean();

    curatedContent = await CuratedChannel.findOne({ childId: userId })
      .select("content.title content.type content.isCompleted")
      .lean();
  } else {
    recentPosts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("content likesCount commentsCount createdAt")
      .lean();

    userChannel = await UserChannel.findOne({ owner: userId })
      .select("name description subscribersCount postsCount")
      .lean();
  }

  return {
    recentPosts: recentPosts,
    userChannel: userChannel,
    curatedContent: curatedContent,
  };
}

export async function getNormalUserDashboardData(userId) {
  const [userSummary, socialActivity] = await Promise.all([
    getUserProfileSummary(userId),
    getSocialActivitySummary(userId, "NORMAL_USER"),
  ]);

  return userSummary
    ? { role: "NORMAL_USER", ...userSummary, socialActivity }
    : null;
}

export async function getChildDashboardData(childId) {
  const childSummary = await getChildProfileSummary(childId);
  const gamesSummary = await getChildGamesSummary(childId);

  return childSummary
    ? {
        role: "CHILD",
        ...childSummary,
        ...gamesSummary,
      }
    : null;
}

export async function getComprehensiveDashboardData(parentId) {
  const [parentSummary, parentFullDoc, parentSocialActivity] =
    await Promise.all([
      getUserProfileSummary(parentId),
      User.findById(parentId).select("children").lean(),
      getSocialActivitySummary(parentId, "PARENT"),
    ]);

  if (!parentSummary || !parentFullDoc) return null;

  const childrenSummaries = parentFullDoc.children
    ? parentFullDoc.children.map(extractChildSummary).filter((c) => c !== null)
    : [];

  return {
    role: "PARENT",
    userProfile: parentSummary,
    socialActivity: parentSocialActivity,
    children: childrenSummaries,
  };
}

async function getChildGamesSummary(childId) {
  try {
    const sessions = await GameSession.aggregate([
      { $match: { childId: new mongoose.Types.ObjectId(childId) } },
      {
        $group: {
          _id: null,
          gamesPlayed: { $sum: 1 },
          totalCoinsEarned: { $sum: "$coinsEarned" },
          totalScore: { $sum: "$score" },
        },
      },
    ]);

    if (!sessions.length) {
      return {
        gamesPlayed: 0,
        totalCoinsEarned: 0,
        totalScore: 0,
      };
    }

    const { gamesPlayed, totalCoinsEarned, totalScore } = sessions[0];
    return { gamesPlayed, totalCoinsEarned, totalScore };
  } catch (error) {
    console.error("Error aggregating child game stats:", error);
    return { gamesPlayed: 0, totalCoinsEarned: 0, totalScore: 0 };
  }
}
