import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },

    targetType: {
      type: String,
      required: true,
      enum: ["Post", "Video"],
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    totalReactions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ targetId: 1 });
CommentSchema.index({ ownerId: 1 });

const POST_CONTENT_TYPES = ["POST_PROFILE", "POST_CHANNEL"];

const VISIBILITY_TYPES = ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"];

const PostSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isSupervised: { type: Boolean, default: false },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "channelType",
    },
    channelType: {
      type: String,
      enum: ["UserChannel", "ChildChannel"],
    },

    contentType: {
      type: String,
      enum: POST_CONTENT_TYPES,
      required: true,
    },

    postTarget: {
      type: String,
      enum: ["PROFILE", "CHANNEL"],
      required: true,
    },

    profileType: {
      type: String,
      enum: ["UserProfile", "ChildProfile"],
    },

    title: { type: String, trim: true, maxlength: 150 },
    content: { type: String },
    mediaUrl: { type: String },
    mediaPublicId: { type: String },

    format: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO"],
      default: "TEXT",
    },

    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },

    reactionCounts: { type: Map, of: Number, default: {} },
    totalReactions: { type: Number, default: 0 },

    visibility: {
      type: String,
      enum: VISIBILITY_TYPES,
      default: "PUBLIC",
    },

    aiSummary: { type: String },
    aiTags: [String],
  },
  { timestamps: true }
);

PostSchema.index({ postTarget: 1, channelType: 1 });
PostSchema.index({ ownerId: 1 });
PostSchema.index({ createdAt: -1 });

PostSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      const Reaction = (await import("../models/reaction.model.js")).default;
      const { Comment } = await import("../models/post.model.js");
      await Reaction.deleteMany({ targetType: "Post", targetId: doc._id });
      await Comment.deleteMany({ post: doc._id });
    } catch (err) {
      console.error("Cleanup failed:", err);
    }
  }
});

const Comment = mongoose.model("Comment", CommentSchema);
const Post = mongoose.model("Post", PostSchema);
export { Comment, Post };
