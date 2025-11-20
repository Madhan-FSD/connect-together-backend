import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["Post", "Comment", "Video"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    type: {
      type: String,
      enum: [
        "LIKE",
        "LOVE",
        "CELEBRATE",
        "INSIGHTFUL",
        "SAD",
        "ANGRY",
        "SUPPORT",
        "CURIOUS",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

reactionSchema.index(
  { actor: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

export default mongoose.model("Reaction", reactionSchema);
