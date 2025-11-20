import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import admin from "../config/firebaseAdmin.js";
import mongoose from "mongoose";
import Conversation from "../models/chat/conversation.model.js";
import Message from "../models/chat/message.model.js";
import Reaction from "../models/chat/chatReaction.model.js";
import { User } from "../models/user.model.js";

const RTDB = admin.database();
const MESSAGES_PER_PAGE = 30;

export const registerFcmToken = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { fcmToken, device } = req.body;
  if (!fcmToken || !device)
    throw new ApiError("fcmToken and device required", 400);

  await User.updateOne(
    { _id: userId },
    { $addToSet: { firebaseTokens: { token: fcmToken, device } } }
  );
  res.json({ success: true });
});

export const unregisterFcmToken = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { fcmToken } = req.body;
  if (!fcmToken) throw new ApiError("fcmToken required", 400);

  await User.updateOne(
    { _id: userId },
    { $pull: { firebaseTokens: { token: fcmToken } } }
  );
  res.json({ success: true });
});

export const createDirectConversation = asyncHandler(async (req, res) => {
  const actorId = req.userId;
  const { otherUserId } = req.body;
  if (!otherUserId) throw new ApiError("otherUserId required", 400);
  if (actorId === otherUserId)
    throw new ApiError("cannot create conversation with self", 400);

  const participantsIds = [actorId.toString(), otherUserId.toString()].sort();

  let conversation = await Conversation.findOne({
    type: "DIRECT",
    "participants.userId": {
      $all: participantsIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!conversation) {
    const participants = participantsIds.map((id) => ({
      userId: id,
      role: "MEMBER",
      joinedAt: new Date(),
    }));

    conversation = await Conversation.create({
      type: "DIRECT",
      participants,
      adminIds: [],
      createdBy: actorId,
      lastMessageAt: new Date(),
      messageCount: 0,
      unreadCounts: { [actorId]: 0, [otherUserId]: 0 },
    });
  }

  try {
    await RTDB.ref(`events/conversations/${conversation._id}`).set({
      event: "CONVERSATION_CREATED",
      conversationId: conversation._id.toString(),
      participants: conversation.participants.map((p) => p.userId.toString()),
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB publish failed", e);
  }

  try {
    const otherUser = await User.findById(otherUserId)
      .select("firebaseTokens firstName")
      .lean();
    if (otherUser && (otherUser.firebaseTokens || []).length) {
      const tokens = otherUser.firebaseTokens.map((t) => t.token);
      const payload = {
        tokens,
        notification: {
          title: `${
            req.userDisplayName || otherUser.firstName || "Someone"
          } started a chat`,
          body: `Open the app to reply`,
        },
        data: {
          conversationId: conversation._id.toString(),
          event: "NEW_CONVERSATION",
        },
      };
      await admin.messaging().sendMulticast(payload);
    }
  } catch (e) {
    console.warn("FCM sendMulticast error", e);
  }

  res.json({ conversation });
});

export const createGroupConversation = asyncHandler(async (req, res) => {
  const creatorId = req.userId;
  const { name, participantIds = [] } = req.body;
  if (!name || typeof name !== "string")
    throw new ApiError("Group name required", 400);

  const unique = Array.from(
    new Set([creatorId.toString(), ...participantIds.map(String)])
  );

  const participants = unique.map((id) => ({
    userId: id,
    role: id === creatorId ? "OWNER" : "MEMBER",
    joinedAt: new Date(),
  }));

  const unreadCounts = {};
  unique.forEach((id) => (unreadCounts[id] = 0));

  const conversation = await Conversation.create({
    type: "GROUP",
    title: name,
    participants,
    adminIds: [creatorId],
    settings: { discoverable: false },
    messageCount: 0,
    unreadCounts,
    createdBy: creatorId,
  });

  try {
    await RTDB.ref(`events/conversations/${conversation._id}`).set({
      event: "GROUP_CREATED",
      conversationId: conversation._id.toString(),
      name,
      participants: unique,
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB publish failed", e);
  }

  try {
    const users = await User.find({ _id: { $in: unique } })
      .select("firebaseTokens")
      .lean();
    const tokens = users.flatMap((u) =>
      (u.firebaseTokens || []).map((t) => t.token)
    );
    if (tokens.length) {
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: `Added to group: ${name}`,
          body: "Open the app to view the group",
        },
        data: {
          conversationId: conversation._id.toString(),
          event: "GROUP_INVITE",
        },
      });
    }
  } catch (e) {
    console.warn("FCM group notify failed", e);
  }

  res.status(201).json({ conversation });
});

export const listUserConversations = asyncHandler(async (req, res) => {
  console.log("req", req.userId);
  const userId = req.userId;
  const convos = await Conversation.find({
    "participants.userId": userId.toString(),
  })
    .sort({ lastMessageAt: -1 })
    .lean();

  const enriched = await Promise.all(
    convos.map(async (c) => {
      const copy = { ...c };
      if (c.type === "DIRECT") {
        const other = c.participants.find(
          (p) => p.userId.toString() !== userId.toString()
        );
        if (other) {
          const u = await User.findById(other.userId)
            .select("firstName lastName avatar username isOnline")
            .lean();
          copy.otherUser = u || null;
        }
      }
      copy.unread = (c.unreadCounts && (c.unreadCounts[userId] || 0)) || 0;
      return copy;
    })
  );

  res.json({ conversations: enriched });
});

export const getConversation = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;
  if (!conversationId) throw new ApiError("conversationId required", 400);

  const convo = await Conversation.findById(conversationId).lean();
  if (!convo) throw new ApiError("Conversation not found", 404);

  const participantIds = convo.participants.map((p) => p.userId.toString());
  if (!participantIds.includes(userId.toString()))
    throw new ApiError("Access denied", 403);

  if (convo.type === "DIRECT") {
    const other = convo.participants.find(
      (p) => p.userId.toString() !== userId.toString()
    );
    if (other) {
      const u = await User.findById(other.userId)
        .select("firstName lastName avatar username isOnline")
        .lean();
      convo.otherUser = u || null;
    }
  }

  convo.unread = (convo.unreadCounts && convo.unreadCounts[userId]) || 0;

  res.json({ conversation: convo });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.userId;
  const {
    conversationId,
    body,
    attachments = [],
    parentMessageId = null,
    mentions = [],
  } = req.body;

  if (!conversationId) throw new ApiError("conversationId required", 400);
  if (!body && (!attachments || attachments.length === 0))
    throw new ApiError("content required", 400);

  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new ApiError("Conversation not found", 404);

  const participantIds = convo.participants.map((p) => p.userId.toString());
  if (!participantIds.includes(senderId.toString()))
    throw new ApiError("Access denied", 403);

  if (convo.isReadOnly && !convo.allowedPosters.includes(senderId))
    throw new ApiError("Conversation is read-only", 403);

  const delivery = participantIds.map((userId) => ({
    userId: userId,
    deliveredAt:
      userId.toString() === senderId.toString() ? new Date() : undefined,
    readAt: userId.toString() === senderId.toString() ? new Date() : undefined,
  }));

  const msg = await Message.create({
    conversationId,
    senderId,
    body,
    attachments,
    parentMessageId,
    mentions,
    messageType: attachments && attachments.length ? "FILE" : "TEXT",
    delivery,
  });

  const update = {
    $set: {
      lastMessageId: msg._id,
      lastMessageAt: msg.createdAt,
    },
    $inc: { messageCount: 1 },
  };

  const incObj = {};
  convo.participants.forEach((p) => {
    const pid = p.userId.toString();
    if (pid !== senderId.toString()) {
      incObj[`unreadCounts.${pid}`] = 1;
    }
  });
  if (Object.keys(incObj).length)
    update.$inc = { ...(update.$inc || {}), ...incObj };

  await Conversation.updateOne({ _id: convo._id }, update);

  try {
    await RTDB.ref(`events/messages/${conversationId}`).push({
      event: "NEW_MESSAGE",
      conversationId,
      message: {
        _id: msg._id.toString(),
        senderId: senderId.toString(),
        body: msg.body,
        createdAt: msg.createdAt,
        attachments: msg.attachments || [],
        parentMessageId: parentMessageId ? parentMessageId.toString() : null,
      },
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB publish message failed", e);
  }

  try {
    const otherParticipantIds = convo.participants
      .map((p) => p.userId.toString())
      .filter((id) => id !== senderId.toString());
    const users = await User.find({ _id: { $in: otherParticipantIds } })
      .select("firebaseTokens firstName")
      .lean();
    const tokens = users.flatMap((u) =>
      (u.firebaseTokens || []).map((t) => t.token)
    );

    if (tokens.length) {
      const senderUser = await User.findById(senderId)
        .select("firstName")
        .lean();
      const title =
        convo.type === "DIRECT"
          ? `${senderUser?.firstName || "Someone"} sent you a message`
          : `${senderUser?.firstName || "Someone"} in ${
              convo.title || "a group"
            }:`;
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title,
          body: body
            ? body.length > 100
              ? body.slice(0, 100) + "…"
              : body
            : "Attachment",
        },
        data: {
          conversationId: conversationId.toString(),
          messageId: msg._id.toString(),
          event: "MESSAGE",
        },
      });
    }
  } catch (e) {
    console.warn("FCM send failed", e);
  }

  res.status(201).json({ message: msg });
});

export const getMessages = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;
  const cursor = req.query.cursor || null;

  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new ApiError("Conversation not found", 404);

  const participantIds = convo.participants.map((p) => p.userId.toString());
  if (!participantIds.includes(userId.toString()))
    throw new ApiError("Access denied", 403);

  let query = { conversationId };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    const cursorMsg = await Message.findById(cursor).select("createdAt").lean();
    if (cursorMsg) query.createdAt = { $lt: cursorMsg.createdAt };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(MESSAGES_PER_PAGE)
    .populate("senderId", "firstName lastName avatar email")
    .lean();

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unreadCounts.${userId}`]: 0 } }
  );

  res.json({ messages: messages.reverse() });
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId, messageId } = req.body;
  if (!conversationId || !messageId)
    throw new ApiError("conversationId & messageId required", 400);

  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new ApiError("Conversation not found", 404);
  if (
    !convo.participants
      .map((p) => p.userId.toString())
      .includes(userId.toString())
  )
    throw new ApiError("Access denied", 403);

  const filter = {
    _id: messageId,
    "delivery.userId": userId,
    "delivery.readAt": { $exists: false },
  };
  const update = {
    $set: { "delivery.$.readAt": new Date() },
  };

  const result = await Message.updateOne(filter, update);

  if (result.matchedCount === 0) {
    const messageExists = await Message.exists({ _id: messageId });
    if (!messageExists) throw new ApiError("Message not found", 404);
  }

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unreadCounts.${userId}`]: 0 } }
  );

  try {
    await RTDB.ref(`events/reads/${conversationId}`).push({
      event: "READ",
      conversationId,
      messageId,
      userId,
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB read publish failed", e);
  }

  res.json({ ok: true, modifiedCount: result.modifiedCount });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { messageId, reaction } = req.body;
  if (!messageId || !reaction)
    throw new ApiError("messageId & reaction required", 400);

  const msg = await Message.findById(messageId).select(
    "conversationId reactionCounts"
  );
  if (!msg) throw new ApiError("Message not found", 404);

  const conversationId = msg.conversationId;
  const existingReaction = await Reaction.findOne({ messageId, userId });

  let action;

  if (existingReaction) {
    if (existingReaction.emoji === reaction) {
      await Reaction.deleteOne({ _id: existingReaction._id });
      await Message.updateOne(
        { _id: messageId },
        { $inc: { [`reactionCounts.${reaction}`]: -1 } }
      );
      action = "REMOVED";
    } else {
      await Reaction.updateOne(
        { _id: existingReaction._id },
        { emoji: reaction }
      );
      await Message.updateOne(
        { _id: messageId },
        {
          $inc: {
            [`reactionCounts.${existingReaction.emoji}`]: -1,
            [`reactionCounts.${reaction}`]: 1,
          },
        }
      );
      action = "CHANGED";
    }
  } else {
    await Reaction.create({
      messageId,
      userId,
      emoji: reaction,
      conversationId: conversationId,
    });
    await Message.updateOne(
      { _id: messageId },
      { $inc: { [`reactionCounts.${reaction}`]: 1 } }
    );
    action = "ADDED";
  }

  const updatedCounts = (
    await Message.findById(messageId).select("reactionCounts").lean()
  ).reactionCounts;

  try {
    await RTDB.ref(`events/reactions/${conversationId}`).push({
      event: "REACTION_UPDATED",
      conversationId: conversationId.toString(),
      messageId: msg._id.toString(),
      userId,
      reaction,
      action,
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB reaction publish failed", e);
  }

  res.json({ ok: true, reactionCounts: updatedCounts });
});

export const typingStart = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.body;
  if (!conversationId) throw new ApiError("conversationId required", 400);

  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new ApiError("Conversation not found", 404);
  if (
    !convo.participants
      .map((p) => p.userId.toString())
      .includes(userId.toString())
  )
    throw new ApiError("Access denied", 403);

  await RTDB.ref(`typing/${conversationId}/${userId}`).set({ ts: Date.now() });
  res.json({ ok: true });
});

export const typingStop = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.body;
  if (!conversationId) throw new ApiError("conversationId required", 400);

  await RTDB.ref(`typing/${conversationId}/${userId}`).remove();
  res.json({ ok: true });
});

export const setPresence = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status = "ONLINE", meta = {} } = req.body;
  if (
    !["ONLINE", "OFFLINE", "AWAY", "DO_NOT_DISTURB"].includes(
      status.toUpperCase()
    )
  )
    throw new ApiError("Invalid status", 400);

  await RTDB.ref(`presence/${userId}`).set({
    status: status.toUpperCase(),
    meta,
    ts: Date.now(),
  });
  res.json({ ok: true });
});

export const fetchPresence = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const snap = await RTDB.ref(`presence/${userId}`).once("value");
  const val = snap.val();
  if (!val) return res.json({ status: "OFFLINE", ts: Date.now() });
  res.json(val);
});

export const renameConversation = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { conversationId } = req.params;
  const { title } = req.body;
  if (!title) throw new ApiError("title required", 400);

  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new ApiError("Conversation not found", 404);

  if (
    convo.type === "GROUP" &&
    !convo.adminIds.map(String).includes(userId.toString())
  )
    throw new ApiError("Only admins can rename group", 403);

  convo.title = title;
  await convo.save();

  try {
    await RTDB.ref(`events/conversations/${conversationId}`).set({
      event: "CONVERSATION_UPDATED",
      conversationId,
      title,
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB publish failed", e);
  }

  res.json({ ok: true, title });
});

export const addRemoveGroupMembers = asyncHandler(async (req, res) => {
  const actorId = req.userId;
  const { groupId, memberIds = [], action } = req.body;
  if (
    !groupId ||
    !Array.isArray(memberIds) ||
    !["add", "remove"].includes(action)
  )
    throw new ApiError("invalid params", 400);

  const convo = await Conversation.findById(groupId);
  if (!convo || convo.type !== "GROUP")
    throw new ApiError("Group not found", 404);

  if (!convo.adminIds.map(String).includes(actorId.toString()))
    throw new ApiError("Only admins can modify members", 403);

  let current = convo.participants.map((p) => p.userId.toString());
  const addedMembers = [];

  if (action === "add") {
    memberIds.forEach((id) => {
      if (!current.includes(id.toString())) {
        current.push(id.toString());
        addedMembers.push(id.toString());
      }
    });
  } else {
    current = current.filter((id) => !memberIds.includes(id.toString()));
    convo.adminIds = convo.adminIds.filter(
      (a) => !memberIds.includes(a.toString())
    );
  }

  convo.participants = current.map((id) => ({
    userId: id,
    role: convo.adminIds.includes(id) ? "ADMIN" : "MEMBER",
    joinedAt: new Date(),
  }));

  const newUnreadCounts = {};
  current.forEach((id) => {
    newUnreadCounts[id] = convo.unreadCounts?.[id] || 0;
  });
  convo.unreadCounts = newUnreadCounts;

  await convo.save();

  try {
    await RTDB.ref(`events/conversations/${convo._id}`).push({
      event: "MEMBERS_UPDATED",
      conversationId: convo._id.toString(),
      members: current,
      action,
      ts: Date.now(),
    });
  } catch (e) {
    console.warn("RTDB push failed", e);
  }

  if (action === "add" && addedMembers.length > 0) {
    const users = await User.find({ _id: { $in: addedMembers } })
      .select("firebaseTokens")
      .lean();
    const tokens = users.flatMap((u) =>
      (u.firebaseTokens || []).map((t) => t.token)
    );
    if (tokens.length) {
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: `Added to group: ${convo.title || "Group"}`,
          body: "You were added to a group",
        },
        data: { conversationId: convo._id.toString(), event: "ADDED_TO_GROUP" },
      });
    }
  }

  res.json({
    ok: true,
    participants: convo.participants,
    admins: convo.adminIds,
  });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.body;
  if (!groupId) throw new ApiError("groupId required", 400);

  const convo = await Conversation.findById(groupId);
  if (!convo || convo.type !== "GROUP")
    throw new ApiError("Group not found", 404);

  convo.participants = convo.participants.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
  convo.adminIds = convo.adminIds.filter(
    (a) => a.toString() !== userId.toString()
  );
  if (convo.unreadCounts) delete convo.unreadCounts[userId];

  if (convo.participants.length < 2) {
    await Message.deleteMany({ conversationId: convo._id });
    await Conversation.deleteOne({ _id: convo._id });
    return res.json({ message: "Group dissolved" });
  }

  await convo.save();
  await RTDB.ref(`events/conversations/${convo._id}`).push({
    event: "MEMBER_LEFT",
    conversationId: convo._id.toString(),
    userId,
    ts: Date.now(),
  });

  res.json({ ok: true });
});

export const presignUpload = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType)
    throw new ApiError("filename & contentType required", 400);

  const bucket = admin.storage().bucket();
  const destPath = `chat_uploads/${Date.now()}_${filename}`;
  const file = bucket.file(destPath);

  const options = {
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  };

  const [uploadUrl] = await file.getSignedUrl(options);
  const publicPath = `gs://${bucket.name}/${destPath}`;
  res.json({ uploadUrl, path: destPath, publicPath });
});

export const listUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      _id: { $ne: req.userId },
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("firstName lastName avatar email")
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    return res.status(200).json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error listing users:", error);
    return res.status(500).json({ message: "Failed to fetch user list." });
  }
};
