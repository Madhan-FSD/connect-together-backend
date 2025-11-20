import mongoose from "mongoose";

const ReadReceiptSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    readerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ReadReceiptSchema.index(
  { conversationId: 1, messageId: 1, readerId: 1 },
  { unique: true }
);

export default mongoose.model("ReadReceipt", ReadReceiptSchema);
