import mongoose from "mongoose";

const TypingSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    stoppedAt: Date,
  },
  { timestamps: false }
);

TypingSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Typing", TypingSchema);
