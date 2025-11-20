import mongoose from "mongoose";

const childChannelSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },

    handle: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: true,
      match: /^[a-z0-9_]{3,20}$/,
    },

    description: { type: String, maxLength: 250, default: "" },
    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },

    subscribersCount: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },

    uploadPermission: {
      type: String,
      enum: ["FULL", "BLOCKED", "LIMITED"],
      default: "BLOCKED",
      required: true,
    },

    uploadTimeWindow: {
      startTime: String,
      endTime: String,
      days: {
        type: [String],
        enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        default: [],
      },
    },

    commentModeration: { type: Boolean, default: true },

    likeVisibility: {
      type: String,
      enum: ["PUBLIC_COUNT", "PRIVATE_COUNT", "DISABLED"],
      default: "PUBLIC_COUNT",
    },

    channelVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChildChannel", childChannelSchema);
