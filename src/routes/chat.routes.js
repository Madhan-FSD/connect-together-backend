import { Router } from "express";
import {
  registerFcmToken,
  unregisterFcmToken,
  createDirectConversation,
  createGroupConversation,
  listUserConversations,
  getConversation,
  sendMessage,
  getMessages,
  markMessageRead,
  reactToMessage,
  typingStart,
  typingStop,
  setPresence,
  fetchPresence,
  renameConversation,
  addRemoveGroupMembers,
  leaveGroup,
  presignUpload,
  listUsers,
} from "../controllers/chat.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/users", listUsers);
router.post("/auth/fcm/register", registerFcmToken);
router.post("/auth/fcm/unregister", unregisterFcmToken);
router.get("/", listUserConversations);
router.post("/direct", createDirectConversation);
router.post("/group", createGroupConversation);
router.get("/:conversationId", getConversation);
router.patch("/:conversationId/rename", renameConversation);
router.post("/group/members", addRemoveGroupMembers);
router.post("/group/leave", leaveGroup);

router.post("/messages", sendMessage);
router.get("/:conversationId/messages", getMessages);

router.post("/message/read", markMessageRead);
router.post("/message/react", reactToMessage);

router.post("/typing/start", typingStart);
router.post("/typing/stop", typingStop);
router.post("/presence", setPresence);
router.get("/presence/:userId", fetchPresence);

router.post("/upload/presign", presignUpload);

export default router;
