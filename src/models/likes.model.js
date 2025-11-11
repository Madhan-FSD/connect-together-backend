import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Crucial: Create a unique compound index to prevent a user from liking the same post twice.
likeSchema.index({ post: 1, likedBy: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);
