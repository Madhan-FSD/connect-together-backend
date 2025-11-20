import mongoose from "mongoose";

const PresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "AWAY", "DO_NOT_DISTURB"],
      default: "OFFLINE",
    },
    lastSeenAt: { type: Date, default: Date.now },
    clientMeta: {
      platform: String,
      device: String,
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Presence", PresenceSchema);
