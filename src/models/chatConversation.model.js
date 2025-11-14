import mongoose from "mongoose";

const chatConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: true,
      validate: {
        validator: (arr) => arr.length === 2,
        message: "A conversation must have exactly two participants.",
      },
      index: true,
    },

    lastMessage: {
      type: String,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    isArchived: {
      type: Map,
      of: Boolean,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ participants: 1 }, { unique: true });

export default ChatConversation = mongoose.model(
  "ChatConversation",
  chatConversationSchema
);
