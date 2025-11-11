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
  },
  {
    timestamps: true,
  }
);

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

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "channelType", // dynamic ref
      required: false,
    },

    channelType: {
      type: String,
      enum: ["UserChannel", "ChildChannel"],
      required: function () {
        return this.postTarget === "CHANNEL";
      },
    },

    postTarget: {
      type: String,
      enum: ["CHANNEL", "PROFILE"],
      required: true,
    },

    profileType: {
      type: String,
      enum: ["UserProfile", "ChildProfile"],
      required: function () {
        return this.postTarget === "PROFILE";
      },
    },

    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    content: {
      type: String,
    },

    mediaUrl: {
      type: String,
    },

    mediaPublicId: {
      type: String,
    },

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
  },
  {
    timestamps: true,
  }
);

PostSchema.index({ postTarget: 1, channelType: 1 });
PostSchema.index({ ownerId: 1 });
PostSchema.index({ createdAt: -1 });

const Comment = mongoose.model("Comment", CommentSchema);
const Post = mongoose.model("Post", PostSchema);

export { Comment, Post };
