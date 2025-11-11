import mongoose from "mongoose";

const userChannelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true, maxLength: 50 },
    handle: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: true,
    },
    description: { type: String, maxLength: 250, default: "" },
    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    subscribersCount: { type: Number, default: 0 },
    channelVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserChannel", userChannelSchema);
