import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserChannel",
    },
    playlistVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"],
      default: "PUBLIC",
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1, deletedAt: 1 });
playlistSchema.index({ channelId: 1, playlistVisibility: 1, deletedAt: 1 });
playlistSchema.index({ deletedAt: 1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);
