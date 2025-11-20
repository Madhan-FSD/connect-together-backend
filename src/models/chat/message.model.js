import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    filename: String,
    mimeType: String,
    size: Number,
    url: String,
    publicId: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const DeliveryStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  deliveredAt: Date,
  readAt: Date,
  deletedForUser: { type: Boolean, default: false },
});

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    body: { type: String, default: "" },

    blocks: { type: mongoose.Schema.Types.Mixed },

    attachments: [AttachmentSchema],

    messageType: {
      type: String,
      enum: [
        "TEXT",
        "IMAGE",
        "FILE",
        "SYSTEM",
        "ANNOUNCEMENT",
        "REPLY",
        "MENTION",
      ],
      default: "TEXT",
      index: true,
    },

    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      index: true,
    },

    reactionCounts: { type: Map, of: Number, default: {} },

    edited: { type: Boolean, default: false },
    editHistory: [
      {
        body: String,
        editedAt: Date,
      },
    ],
    deleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedReason: String,

    delivery: [DeliveryStatusSchema],

    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    flagged: { type: Boolean, default: false },
    flaggedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    moderationAction: {
      type: String,
      enum: ["NONE", "HIDE", "DELETE", "REDACT", "WARN"],
      default: "NONE",
    },

    searchableText: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

MessageSchema.index(
  { body: "text", searchableText: "text" },
  { weights: { body: 5, searchableText: 1 } }
);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);
