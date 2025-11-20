import mongoose from "mongoose";

const VIDEO_CONTENT_TYPES = [
  "VIDEO_CHANNEL",
  "VIDEO_PROFILE",
  "VIDEO_COURSE",
  "VIDEO_SHORT",
];

const VIDEO_VISIBILITY = ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"];

const VIDEO_STATUS = [
  "PROCESSING",
  "LIVE",
  "BLOCKED",
  "DELETED",
  "COURSE_LOCKED",
];

const videoSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: VIDEO_CONTENT_TYPES,
      required: true,
      default: "VIDEO_CHANNEL",
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "channelType",
    },
    channelType: { type: String, enum: ["UserChannel", "ChildChannel"] },

    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    playlistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }],

    title: { type: String, required: true, trim: true, maxLength: 150 },
    description: { type: String, trim: true, maxLength: 2000 },

    duration: { type: Number, min: 1, default: 1 },

    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    thumbnailUrl: { type: String },

    qualityUrls: { type: Map, of: String, default: {} },

    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },

    visibility: {
      type: String,
      enum: VIDEO_VISIBILITY,
      default: "PUBLIC",
    },

    price: { type: Number, min: 0, default: 0 },

    videoStatus: {
      type: String,
      enum: VIDEO_STATUS,
      default: "LIVE",
    },

    tags: [{ type: String, trim: true }],
    category: { type: String },

    reactionCounts: { type: Map, of: Number, default: {} },
    totalReactions: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null },
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

videoSchema.index({ channelId: 1, channelType: 1, videoStatus: 1 });
videoSchema.index({ ownerId: 1, createdAt: -1 });
videoSchema.index({ visibility: 1 });
videoSchema.index({ deletedAt: 1 });
videoSchema.index({ title: "text", description: "text", tags: "text" });

const Video = mongoose.model("Video", videoSchema);
export default Video;
