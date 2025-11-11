import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["User", "UserChannel", "ChildChannel"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
  },
  { timestamps: true }
);

followSchema.index(
  { follower: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

export default mongoose.model("Follow", followSchema);
