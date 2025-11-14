import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  generateFirebaseToken,
  createChatConversation,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(protect);

/**
 * GET /api/chat/token
 * Returns a Firebase Custom Token for Firestore authentication.
 */
router.route("/token").get(generateFirebaseToken);

/**
 * POST /api/chat/conversations
 * Body: { participantId: string }
 * Creates or retrieves the MongoDB conversation ID.
 */
router.route("/conversations").post(createChatConversation);

export default router;
