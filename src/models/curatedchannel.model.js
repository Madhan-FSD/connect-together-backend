import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["VIDEO", "POST", "ARTICLE", "QUIZ"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxLength: 150 },
    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: "" },
    summary: { type: String, trim: true, maxLength: 500 },
    aiSummary: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    duration: { type: Number, min: 0 },
    difficulty: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      default: "BEGINNER",
    },
    sourceChannelId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "sourceChannelType",
    },
    sourceChannelType: {
      type: String,
      enum: ["UserChannel", "ChildChannel"],
      default: "UserChannel",
    },
    isCompleted: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

const curatedChannelSchema = new mongoose.Schema(
  {
    curatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelName: { type: String, required: true, trim: true, maxLength: 100 },
    handle: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_]{3,30}$/,
    },
    description: { type: String, trim: true, maxLength: 500 },
    category: {
      type: String,
      enum: [
        "STEM",
        "ART",
        "MUSIC",
        "SCIENCE",
        "TECHNOLOGY",
        "LITERATURE",
        "AI_EDUCATION",
        "GENERAL_KNOWLEDGE",
      ],
      default: "GENERAL_KNOWLEDGE",
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    ageGroup: {
      type: String,
      enum: ["KIDS", "TEENS", "ADULTS", "ALL"],
      default: "ALL",
    },
    language: { type: String, default: "en" },
    visibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"],
      default: "PUBLIC",
    },
    content: [contentSchema],
    featured: { type: Boolean, default: false },
    thumbnailUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalSaves: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    aiTags: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

curatedChannelSchema.index({ category: 1 });
curatedChannelSchema.index({ tags: 1 });
curatedChannelSchema.index({ handle: 1 });
curatedChannelSchema.index({ featured: 1 });

export default mongoose.model("CuratedChannel", curatedChannelSchema);
