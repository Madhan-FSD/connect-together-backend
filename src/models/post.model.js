import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
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

CommentSchema.index({ post: 1 });
CommentSchema.index({ ownerId: 1 });

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
      required: function () {
        return this.isSupervised;
      },
    },
    isSupervised: { type: Boolean, default: false },

    channelId: { type: mongoose.Schema.Types.ObjectId, refPath: "channelType" },
    channelType: {
      type: String,
      enum: ["UserChannel", "ChildChannel"],
    },
    postTarget: {
      type: String,
      enum: ["CHANNEL", "PROFILE"],
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
    contentType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO"],
      default: "TEXT",
    },

    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },

    aiSummary: { type: String },
    aiTags: [String],

    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    totalReactions: { type: Number, default: 0 },
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
