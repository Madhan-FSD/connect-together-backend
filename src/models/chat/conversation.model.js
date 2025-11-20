import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["MEMBER", "ADMIN", "MODERATOR", "OWNER"],
    default: "MEMBER",
  },
  joinedAt: { type: Date, default: Date.now },
  lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  mutedUntil: Date,
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  settings: {
    notificationsEnabled: { type: Boolean, default: true },
    pushPriority: {
      type: String,
      enum: ["DEFAULT", "HIGH"],
      default: "DEFAULT",
    },
  },
});

const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["DIRECT", "GROUP", "CHANNEL"],
      required: true,
      default: "DIRECT",
      index: true,
    },

    title: { type: String, trim: true, index: true },

    description: String,

    participants: { type: [ParticipantSchema], default: [] },

    adminIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ],

    settings: {
      discoverable: { type: Boolean, default: false },
      joinApprovalRequired: { type: Boolean, default: false },
      maxMembers: { type: Number, default: 5000 },
      readReceiptsEnabled: { type: Boolean, default: true },
      typingIndicatorEnabled: { type: Boolean, default: true },
      messageEditWindowSeconds: { type: Number, default: 3600 },
      messageDeleteSoft: { type: Boolean, default: true },
      allowedFiles: {
        type: [String],
        default: ["image/*", "video/*", "application/pdf"],
      },
    },

    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, index: true },

    isPrivate: { type: Boolean, default: true, index: true },
    inviteOnly: { type: Boolean, default: false },
    joinCodeHash: String,

    deletedAt: Date,
    isArchived: { type: Boolean, default: false },

    messageCount: { type: Number, default: 0 },
    unreadCounts: { type: Map, of: Number },

    pinnedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    isReadOnly: { type: Boolean, default: false },
    isRestricted: { type: Boolean, default: false },
    allowedPosters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    tags: [String],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ConversationSchema.index({ "participants.userId": 1, type: 1 });
ConversationSchema.index({ createdBy: 1, createdAt: -1 });
ConversationSchema.index({ title: "text", description: "text", tags: "text" });

ConversationSchema.statics.createDirectIfNotExists = async function (
  userAId,
  userBId
) {
  const Conversation = this;
  const participants = [userAId.toString(), userBId.toString()].sort();
  const existing = await Conversation.findOne({
    type: "DIRECT",
    $expr: {
      $setIsSubset: [
        participants,
        {
          $map: {
            input: "$participants",
            as: "p",
            in: { $toString: "$$p.userId" },
          },
        },
      ],
    },
    $where: "this.participants.length === 2",
  });
  if (existing) return existing;
  const convo = await Conversation.create({
    type: "DIRECT",
    participants: [{ userId: userAId }, { userId: userBId }],
    createdBy: userAId,
  });
  return convo;
};

export default mongoose.model("Conversation", ConversationSchema);
