import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: [
        "CONNECTION_REQUEST",
        "CONNECTION_ACCEPTED",
        "NEW_FOLLOWER",
        "POST_LIKED",
        "COMMENTED",
        "POST_SHARED",
        "MENTIONED",
        "SYSTEM",
      ],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    deliveredAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1 });
export default mongoose.model("Notification", notificationSchema);
