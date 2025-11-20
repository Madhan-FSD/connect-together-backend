import mongoose from "mongoose";

const userChannelSchema = new mongoose.Schema(
  {
    owner: {
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

    channelVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserChannel", userChannelSchema);
