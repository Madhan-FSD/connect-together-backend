import { Comment, Post } from "../models/post.model.js";
import UserChannel from "../models/userchannel.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { logActivity } from "../utils/activityLog.js";
import { checkUploadGuardrails } from "../utils/permissionGuardrails.js";
import fs from "fs";
import mongoose from "mongoose";
import { getChildName } from "../utils/child.utils.js";

export const createPost = async (req, res) => {
  const { title, content, channelId: bodyChannelId, postTarget } = req.body;
  const file = req.file;
  const requesterId = req.userId;
  const requesterRole = req.role;
  let isSupervised = false;
  let ownerId = requesterId;
  let parentId = null;
  let entityType = null;
  if (requesterRole === "CHILD") {
    isSupervised = true;
    parentId = req.parentId;
    if (postTarget === "PROFILE" || !bodyChannelId) entityType = "ChildProfile";
    else entityType = "ChildChannel";
  } else {
    if (postTarget === "PROFILE" || !bodyChannelId) entityType = "UserProfile";
    else entityType = "UserChannel";
  }
  let channelId = bodyChannelId || null;
  if (!content && !file) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return res
      .status(400)
      .json({ error: "Post must contain content or media." });
  }
  let mediaUrl = null;
  let mediaPublicId = null;
  let contentType = file
    ? file.mimetype.startsWith("video")
      ? "VIDEO"
      : "IMAGE"
    : "TEXT";
  try {
    if (isSupervised) {
      const {
        isAllowed,
        message,
        channel: channelDoc,
      } = await checkUploadGuardrails(parentId, ownerId);
      if (!isAllowed) {
        if (file && fs.existsSync(file.path))
          await fs.promises.unlink(file.path).catch(() => {});
        const childName = await getChildName(ownerId || parentId);
        await logActivity(
          "POST_FAILED",
          parentId,
          ownerId,
          childName,
          null,
          message
        );
        return res.status(403).json({ error: message });
      }
      if (channelDoc && postTarget === "CHANNEL" && !channelId)
        channelId = channelDoc._id;
    } else {
      if (entityType === "UserChannel" && channelId) {
        const independentChannel = await UserChannel.findById(channelId);
        if (
          !independentChannel ||
          independentChannel.userId.toString() !== ownerId.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Unauthorized access or channel not found." });
        }
      }
    }
    if (file) {
      const FOLDER = `posts/${ownerId}`;
      const uploadResult = await uploadOnCloudinary(file.path, FOLDER);
      if (!uploadResult) throw new Error("Media upload failed.");
      mediaUrl = uploadResult.secure_url;
      mediaPublicId = uploadResult.public_id;
    }
    const finalPostTarget = postTarget || (channelId ? "CHANNEL" : "PROFILE");
    let channelType = undefined;
    let profileType = undefined;
    if (finalPostTarget === "CHANNEL")
      channelType = isSupervised ? "ChildChannel" : "UserChannel";
    else profileType = isSupervised ? "ChildProfile" : "UserProfile";
    const newPost = await Post.create({
      ownerId,
      parentId: isSupervised ? parentId : null,
      isSupervised,
      channelId,
      channelType,
      profileType,
      postTarget: finalPostTarget,
      title: title || "",
      content: content || "",
      mediaUrl,
      mediaPublicId,
      contentType,
    });
    if (isSupervised) {
      const childName = await getChildName(ownerId || parentId);
      await logActivity(
        "POSTED",
        parentId,
        ownerId,
        childName,
        newPost._id,
        `Created a ${contentType} post.`
      );
    }
    return res
      .status(201)
      .json({ message: "Post created successfully.", post: newPost });
  } catch (error) {
    if (mediaPublicId)
      await deleteFromCloudinary(mediaPublicId).catch(() => {});
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return res
      .status(500)
      .json({ error: "Failed to create post.", details: error.message });
  }
};

export const getPosts = async (req, res) => {
  const { targetId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    if (!mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ error: "Invalid target ID format." });
    const targetType = (req.query.targetType || "").toUpperCase();
    let query = {};
    if (targetType === "CHANNEL")
      query = { channelId: targetId, postTarget: "CHANNEL" };
    else if (targetType === "USER" || targetType === "PROFILE")
      query = { ownerId: targetId, postTarget: "PROFILE" };
    else query = { $or: [{ ownerId: targetId }, { channelId: targetId }] };
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "ownerId", select: "firstName lastName avatar" })
      .lean();
    const totalPosts = await Post.countDocuments(query);
    return res.status(200).json({
      posts,
      pagination: {
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch posts feed.", details: error.message });
  }
};

export const getPostDetails = async (req, res) => {
  const { postId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid post id" });
    const post = await Post.findById(postId).populate(
      "ownerId",
      "firstName lastName avatar"
    );
    if (!post) return res.status(404).json({ error: "Post not found." });
    const comments = await Comment.find({
      targetId: postId,
      targetType: "Post",
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "firstName lastName avatar");
    return res.status(200).json({ post, comments });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve post details." });
  }
};

export const updatePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;
  const { title, content, visibility } = req.body;
  if (!title && content === undefined && visibility === undefined)
    return res.status(400).json({ error: "Provide fields to update." });
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (post.ownerId.toString() !== userId.toString())
      return res
        .status(403)
        .json({ error: "Not authorized to update this post." });
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (visibility !== undefined) post.visibility = visibility;
    await post.save();
    return res
      .status(200)
      .json({ message: "Post updated successfully.", post });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update post.", details: error.message });
  }
};

export const deletePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found." });
    const isOwner = post.ownerId.toString() === userId.toString();
    const isParentOfChild =
      post.isSupervised &&
      post.parentId &&
      post.parentId.toString() === userId.toString();
    if (!isOwner && !isParentOfChild)
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post." });
    if (post.mediaPublicId)
      await deleteFromCloudinary(post.mediaPublicId).catch(() => {});
    await Comment.deleteMany({ targetId: post._id, targetType: "Post" }).catch(
      () => {}
    );
    await post.deleteOne();
    await logActivity(
      "DELETED",
      post.parentId || userId,
      post.isSupervised ? post.ownerId : null,
      null,
      postId,
      "Post deleted."
    );
    return res.status(200).json({
      message: "Post and associated interactions deleted successfully.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to delete post.", details: error.message });
  }
};

export const addComment = async (req, res) => {
  const { targetId } = req.params;
  const userId = req.userId;
  const { content } = req.body;
  if (!content?.trim())
    return res.status(400).json({ error: "Comment content cannot be empty." });
  try {
    const post = await Post.findById(targetId).select("commentsCount");
    if (!post) return res.status(404).json({ error: "Post not found." });
    const newComment = await Comment.create({
      targetId,
      targetType: "Post",
      ownerId: userId,
      content,
    });
    post.commentsCount += 1;
    await post.save();
    const populatedComment = await Comment.findById(newComment._id).populate(
      "ownerId",
      "firstName lastName avatar"
    );
    return res.status(201).json({
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add comment." });
  }
};

export const getComments = async (req, res) => {
  const { targetId } = req.params;
  try {
    const comments = await Comment.find({ targetId, targetType: "Post" })
      .sort({ createdAt: -1 })
      .populate("ownerId", "firstName lastName avatar");
    return res.status(200).json({ comments });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch comments." });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userId;
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });
    const targetDoc = await Post.findById(comment.targetId).select(
      "ownerId commentsCount"
    );
    const isOwner = comment.ownerId.toString() === userId.toString();
    const isPostOwner =
      targetDoc && targetDoc.ownerId.toString() === userId.toString();
    if (!isOwner && !isPostOwner)
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment." });
    await Comment.deleteOne({ _id: commentId });
    if (targetDoc) {
      targetDoc.commentsCount = Math.max(0, targetDoc.commentsCount - 1);
      await targetDoc.save();
    }
    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete comment." });
  }
};
