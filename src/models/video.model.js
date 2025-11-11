import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ["UGC_CHANNEL", "UGC_POST", "COURSE_VIDEO"],
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.contentType === "UGC_CHANNEL" && this.isSupervised === true;
      },
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: function () {
        return this.contentType === "COURSE_VIDEO";
      },
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserChannel",
      required: function () {
        return this.contentType !== "COURSE_VIDEO";
      },
    },

    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true, maxLength: 100 },
    duration: { type: Number, required: true, min: 1 },
    publicId: { type: String, required: true, unique: true },
    secureUrl: { type: String, required: true },

    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },

    videoStatus: {
      type: String,
      enum: [
        "LIVE",
        "PENDING_REVIEW",
        "BLOCKED_BY_PARENT",
        "DELETED",
        "LOCKED_COURSE",
      ],
      default: "LIVE",
      required: true,
    },

    reactionCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    totalReactions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

videoSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      const Reaction = (await import("../models/reaction.model.js")).default;
      await Reaction.deleteMany({ targetType: "Video", targetId: doc._id });
    } catch (err) {
      console.error("Cleanup reactions for Video failed:", err);
    }
  }
});

const Video = mongoose.model("Video", videoSchema);
export default Video;
