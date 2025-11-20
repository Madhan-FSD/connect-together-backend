import mongoose from "mongoose";
import { checkChildPermission } from "../utils/permissions.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import CuratedChannel from "../models/curatedchannel.model.js";
import ChildChannel from "../models/childchannel.model.js";
import { logActivity } from "../utils/activityLog.js";
import { generateAndStoreSingleInsight } from "../utils/aiUtils.js";

const getParentAndChildInfo = async (childId) => {
  const objectChildId = new mongoose.Types.ObjectId(childId);
  const parent = await User.findOne(
    { "children._id": objectChildId },

    {
      _id: 1,
      children: {
        $elemMatch: { _id: objectChildId, firstName: 1, lastName: 1 },
      },
    }
  ).lean();

  if (!parent) return null;

  const childFirstName = parent.children[0]?.firstName || "N/A";
  const childLastName = parent.children[0]?.lastName || "";

  return {
    parentId: parent._id.toString(),
    childName: `${childFirstName} ${childLastName}`.trim(),
  };
};

export const createChannelPost = async (req, res) => {
  const { childId } = req.params;
  const { content, channelId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(childId) ||
    !content ||
    !mongoose.Types.ObjectId.isValid(channelId)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid Child/Channel ID or missing post content." });
  }

  const info = await getParentAndChildInfo(childId);
  if (!info) return res.status(404).json({ message: "Child not found." });
  const { parentId, childName } = info;

  try {
    const isAllowed = await checkChildPermission(childId, "canPost");
    if (!isAllowed)
      return res
        .status(403)
        .json({ message: "Permission denied: Cannot create posts." });

    const newPost = await Post.create({
      childId,
      parentId,
      channelId,
      content,
    });

    await logActivity(
      "CREATED_POST",
      parentId,
      childId,
      childName,
      newPost._id,
      `Posted content to channel ${channelId}`
    );

    res
      .status(201)
      .json({ message: "Post created successfully.", post: newPost });
  } catch (error) {
    console.error("Error creating channel post:", error);
    res.status(500).json({ message: "Failed to create post." });
  }
};

export const createProfilePost = async (req, res) => {
  const { childId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(childId) || !content) {
    return res
      .status(400)
      .json({ message: "Invalid Child ID or missing post content." });
  }

  const info = await getParentAndChildInfo(childId);
  if (!info) return res.status(404).json({ message: "Child not found." });
  const { parentId, childName } = info;

  try {
    const isAllowed = await checkChildPermission(childId, "canPost");
    if (!isAllowed)
      return res
        .status(403)
        .json({ message: "Permission denied: Cannot create posts." });

    const newPost = await Post.create({
      childId,
      parentId,
      isProfilePost: true,
      content,
    });

    await logActivity(
      "CREATED_PROFILE_POST",
      parentId,
      childId,
      childName,
      newPost._id,
      "Posted content to their profile"
    );

    res
      .status(201)
      .json({ message: "Post created successfully.", post: newPost });
  } catch (error) {
    console.error("Error creating profile post:", error);
    res.status(500).json({ message: "Failed to create post." });
  }
};

export const likePost = async (req, res) => {
  const { childId, postId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(childId) ||
    !mongoose.Types.ObjectId.isValid(postId)
  ) {
    return res.status(400).json({ message: "Invalid Child/Post ID." });
  }

  const info = await getParentAndChildInfo(childId);
  if (!info) return res.status(404).json({ message: "Child not found." });
  const { parentId, childName } = info;

  try {
    const isAllowed = await checkChildPermission(childId, "canLike");
    if (!isAllowed)
      return res
        .status(403)
        .json({ message: "Permission denied: Cannot like posts." });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const likedByUser = post.likes.includes(childId);

    const updateQuery = likedByUser
      ? { $pull: { likes: childId } }
      : { $addToSet: { likes: childId } };

    const action = likedByUser ? "UNLIKED_POST" : "LIKED_POST";

    await Post.findByIdAndUpdate(postId, updateQuery);

    await logActivity(
      action,
      parentId,
      childId,
      childName,
      postId,
      likedByUser ? "Unliked a post" : "Liked a post"
    );

    res.status(200).json({
      message: likedByUser ? "Post unliked." : "Post liked.",
      liked: !likedByUser,
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Failed to process like/unlike." });
  }
};

export const createChildChannel = async (req, res) => {
  const { childId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(childId) || !name) {
    return res
      .status(400)
      .json({ message: "Invalid Child ID or missing channel name." });
  }

  const info = await getParentAndChildInfo(childId);
  if (!info) return res.status(404).json({ message: "Child not found." });
  const { parentId, childName } = info;

  try {
    const isAllowed = await checkChildPermission(childId, "canCreateChannel");
    if (!isAllowed)
      return res
        .status(403)
        .json({ message: "Permission denied: Cannot create channels." });

    const newChannel = await ChildChannel.create({
      childId,
      parentId,
      name: channelName,
      description,
    });

    await logActivity(
      "CREATED_CHANNEL",
      parentId,
      childId,
      childName,
      newChannel._id,
      `Created channel: "${channelName}"`
    );

    res
      .status(201)
      .json({ message: "Channel created successfully.", channel: newChannel });
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ message: "Failed to create channel." });
  }
};

export const completeContent = async (req, res) => {
  const { childId, contentId } = req.params;

  const info = await getParentAndChildInfo(childId);
  if (!info) return res.status(404).json({ message: "Child not found." });
  const { parentId, childName } = info;

  try {
    const updateResult = await CuratedChannel.updateOne(
      { childId, "content._id": contentId },
      { $set: { "content.$.isCompleted": true } }
    );

    if (updateResult.modifiedCount === 0)
      return res
        .status(200)
        .json({ message: "Content not found or already completed." });

    await logActivity(
      "COMPLETED_CONTENT",
      parentId,
      childId,
      childName,
      contentId,
      "Completed a learning item"
    );

    generateAndStoreSingleInsight(parentId, childId, childName).catch((err) =>
      console.error("AI Insight generation failed:", err)
    );

    res
      .status(200)
      .json({ message: "Content marked as completed. Insights..." });
  } catch (error) {
    console.error("Error completing content:", error);
    res.status(500).json({ message: "Failed to mark content as completed." });
  }
};
