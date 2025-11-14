import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import admin from "../config/firebaseAdmin.js";
import { ChatConversation } from "../models/index.js";

export const generateFirebaseToken = asyncHandler(async (req, res) => {
  const { userId, role } = req;

  if (!userId) {
    throw new ApiError("Authentication token missing user ID.", 401);
  }

  try {
    const firebaseUID = userId.toString();

    const customClaims = {
      role: role,
      mongoId: firebaseUID,
    };

    const customToken = await admin
      .auth()
      .createCustomToken(firebaseUID, customClaims);

    res.json({ firebaseToken: customToken });
  } catch (error) {
    console.error("Error generating Firebase Custom Token:", error.message);
    throw new ApiError("Failed to generate secure chat token.", 500);
  }
});

export const createChatConversation = asyncHandler(async (req, res) => {
  const selfId = req.userId;
  const { participantId } = req.body;

  if (!participantId) {
    throw new ApiError("Participant ID is required to start a chat.", 400);
  }

  const participants = [selfId, participantId]
    .map((id) => id.toString())
    .sort();

  let conversation = await ChatConversation.findOne({
    participants: { $all: participants },
  });

  if (!conversation) {
    conversation = await ChatConversation.create({
      participants: participants,
      unreadCount: { [selfId.toString()]: 0, [participantId.toString()]: 0 },
    });
  }

  res.json({
    conversationId: conversation._id.toString(),
    participants: conversation.participants,
  });
});
