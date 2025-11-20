import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inviteeEmail: { type: String, index: true },
    inviteeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    tokenHash: String,
    expiresAt: Date,
    acceptedAt: Date,
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
      default: "PENDING",
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

InviteSchema.index({ conversationId: 1, inviteeUserId: 1 });

export default mongoose.model("Invite", InviteSchema);
