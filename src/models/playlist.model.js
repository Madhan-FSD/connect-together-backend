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
      ref: "User", // Links the playlist to the User (channel owner)
      required: true,
    },
    // The videos array stores references to the Video model
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    isPublic: {
      type: Boolean,
      default: true, // Determines if the playlist is visible to others
    },
    // Reference to the channel, though owner is often sufficient
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserChannel",
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
