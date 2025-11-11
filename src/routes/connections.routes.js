import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  sendConnectionRequest,
  getPendingRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getConnections,
  getConnectionStatus,
  getSuggestedConnections,
} from "../controllers/connection.controller.js";

const router = express.Router();

router.use(protect);

/**
 * CONNECTIONS
 */
router.get("/pending", getPendingRequests);
router.get("/suggestions", getSuggestedConnections);
router.post("/request", sendConnectionRequest);
router.get("/:userId", getConnections);
router.get("/status/:userId", getConnectionStatus);
router.put("/:connectionId/accept", acceptConnectionRequest);
router.put("/:connectionId/reject", rejectConnectionRequest);
router.delete("/:connectionId", removeConnection);

export default router;
