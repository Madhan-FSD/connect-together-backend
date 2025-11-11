import { Post, Comment } from "../models/post.model.js";
import UserChannel from "../models/userchannel.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { logActivity } from "../utils/activityLog.js";
import { checkUploadGuardrails } from "../utils/permissionGuardrails.js";
import fs from "fs";
import { Like } from "../models/likes.model.js";
import mongoose from "mongoose";
import { getChildName } from "../utils/child.utils.js";

const determinePostContext = (req) => {
  const { channelId, postTarget } = req.body;
  const requesterId = req.userId;
  const requesterRole = req.role;

  let isSupervised = false;
  let ownerId = requesterId;
  let parentId = null;
  let entityType = null;

  if (requesterRole === "CHILD") {
    isSupervised = true;
    parentId = req.parentId;

    if (postTarget === "PROFILE" || !channelId) {
      entityType = "ChildProfile";
    } else if (postTarget === "CHANNEL" && channelId) {
      entityType = "ChildChannel";
    }
  } else if (requesterRole === "PARENT" || requesterRole === "NORMAL_USER") {
    if (postTarget === "PROFILE" || !channelId) {
      entityType = "UserProfile";
    } else if (postTarget === "CHANNEL" && channelId) {
      entityType = "UserChannel";
    }
  }

  return {
    isSupervised,
    ownerId,
    parentId,
    entityType,
    channelId,
    postTarget,
  };
};

export const createPost = async (req, res) => {
  const { title, content, channelId: bodyChannelId, postTarget } = req.body;
  const file = req.file;

  const {
    isSupervised,
    ownerId,
    parentId,
    entityType,
    channelId: contextChannelId,
  } = determinePostContext(req);

  let channelId = bodyChannelId || contextChannelId;

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
        if (file && fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path).catch(() => {});
        }

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

      if (channelDoc && postTarget === "CHANNEL" && !channelId) {
        channelId = channelDoc._id;
      }
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

    if (finalPostTarget === "CHANNEL") {
      channelType = isSupervised ? "ChildChannel" : "UserChannel";
    } else {
      profileType = isSupervised ? "ChildProfile" : "UserProfile";
    }

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

    return res.status(201).json({
      message: "Post created successfully.",
      post: newPost,
    });
  } catch (error) {
    if (mediaPublicId) {
      await deleteFromCloudinary(mediaPublicId).catch((delErr) =>
        console.error("Media rollback failed:", delErr)
      );
    }
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    console.error("Error creating post:", error);
    return res.status(500).json({
      error: "Failed to create post.",
      details: error.message,
    });
  }
};

export const getPosts = async (req, res) => {
  const { targetId } = req.params;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  try {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: "Invalid target ID format." });
    }

    const targetType = req.query.targetType?.toUpperCase();

    if (targetType === "CHANNEL") {
      query = { channelId: targetId, postTarget: "CHANNEL" };
    } else if (targetType === "USER" || targetType === "PROFILE") {
      query = { ownerId: targetId, postTarget: "PROFILE" };
    } else {
      query = {
        $or: [{ ownerId: targetId }, { channelId: targetId }],
      };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "ownerId", select: "username avatar" })
      .exec();

    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
      posts,
      pagination: {
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching posts feed:", error);
    return res.status(500).json({
      error: "Failed to fetch posts feed.",
      details: error.message,
    });
  }
};

export const getPostDetails = async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId).populate(
      "ownerId",
      "username avatarUrl"
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const comments = await Comment.find({ post: postId }).populate(
      "owner",
      "username avatarUrl"
    );

    return res.status(200).json({ post, comments });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve post details." });
  }
};

export const updatePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;
  const { title, content } = req.body;

  if (!title && !content) {
    return res
      .status(400)
      .json({ error: "Must provide title or content to update." });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found." });

    if (post.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this post." });
    }

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;

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

    if (!isOwner && !isParentOfChild) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post." });
    }

    if (post.mediaPublicId) {
      await deleteFromCloudinary(post.mediaPublicId);
    }

    await post.deleteOne();
    await Comment.deleteMany({ post: postId });

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
  const { postId } = req.params;
  const userId = req.userId;
  const { content } = req.body;

  if (!content)
    return res.status(400).json({ error: "Comment content cannot be empty." });

  try {
    const post = await Post.findById(postId).select("commentsCount");
    if (!post) return res.status(404).json({ error: "Post not found." });

    const newComment = await Comment.create({
      post: postId,
      owner: userId,
      content: content,
    });

    post.commentsCount += 1;
    await post.save();

    return res
      .status(201)
      .json({ message: "Comment added successfully.", comment: newComment });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add comment." });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userId;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const post = await Post.findById(comment.post).select(
      "ownerId commentsCount"
    );

    const isOwner = comment.owner.toString() === userId.toString();
    const isPostOwner = post.ownerId.toString() === userId.toString();

    if (!isOwner && !isPostOwner) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment." });
    }

    await Comment.deleteOne({ _id: commentId });

    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();

    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete comment." });
  }
};

export const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  if (!postId) {
    return res.status(400).json({ error: "Post ID is required." });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const existingLike = await Like.findOne({
      post: postId,
      likedBy: userId,
    });

    let message;
    let isLiked;

    if (existingLike) {
      await existingLike.deleteOne();
      isLiked = false;
      message = "Post unliked successfully.";
    } else {
      await Like.create({
        post: postId,
        likedBy: userId,
      });
      isLiked = true;
      message = "Post liked successfully.";
    }

    const totalLikes = await Like.countDocuments({ post: postId });
    post.likeCount = totalLikes;
    await post.save();

    return res.status(200).json({
      message,
      postId,
      isLiked, // Final state
      likeCount: totalLikes,
    });
  } catch (error) {
    console.error("Error toggling like:", error);

    return res.status(500).json({
      error: "Failed to toggle like on post.",
      details: error.message,
    });
  }
};
