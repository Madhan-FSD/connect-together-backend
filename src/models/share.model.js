import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    sharer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: { type: String, enum: ["Post", "Video"], required: true },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    note: String,
    visibility: {
      type: String,
      enum: ["PUBLIC", "CONNECTIONS", "PRIVATE"],
      default: "CONNECTIONS",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Share", shareSchema);
