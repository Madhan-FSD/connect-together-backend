import mongoose from "mongoose";

const FollowerSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    followedEntityType: {
      type: String,
      enum: ["USER", "USER_CHANNEL", "CHILD_CHANNEL"],
      required: true,
    },
  },
  { timestamps: true }
);

FollowerSchema.index(
  { follower: 1, followedEntity: 1, followedEntityType: 1 },
  { unique: true }
);

FollowerSchema.index({ followedEntity: 1, followedEntityType: 1 });
FollowerSchema.index({ follower: 1 });

export default mongoose.model("Follower", FollowerSchema);
