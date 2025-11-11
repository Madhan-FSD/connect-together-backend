import Connection from "../models/connections.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

export const sendConnectionRequest = async (req, res) => {
  const requesterId = req.userId;
  const { recipientId, message } = req.body;

  if (!recipientId) {
    return res.status(400).json({ error: "Recipient ID is required." });
  }

  if (requesterId === recipientId) {
    return res.status(400).json({ error: "Cannot connect with yourself." });
  }

  try {
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "User not found." });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existingConnection) {
      if (existingConnection.status === "ACCEPTED") {
        return res.status(400).json({ error: "Already connected." });
      }
      if (existingConnection.status === "PENDING") {
        return res
          .status(400)
          .json({ error: "Connection request already sent." });
      }
      if (existingConnection.status === "BLOCKED") {
        return res
          .status(403)
          .json({ error: "Cannot send connection request." });
      }
    }

    const newConnection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      status: "PENDING",
      requestMessage: message || "",
    });

    return res.status(201).json({
      message: "Connection request sent successfully.",
      connection: newConnection,
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    return res.status(500).json({
      error: "Failed to send connection request.",
      details: error.message,
    });
  }
};

export const getPendingRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await Connection.find({
      recipient: userId,
      status: "PENDING",
    })
      .populate("requester", "name email avatarUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return res.status(500).json({ error: "Failed to fetch pending requests." });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  const userId = req.userId;
  const { connectionId } = req.params;

  try {
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ error: "Connection request not found." });
    }

    if (connection.recipient.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized." });
    }

    if (connection.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed." });
    }

    connection.status = "ACCEPTED";
    await connection.save();

    return res.status(200).json({
      message: "Connection request accepted.",
      connection,
    });
  } catch (error) {
    console.error("Error accepting connection:", error);
    return res.status(500).json({ error: "Failed to accept connection." });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  const userId = req.userId;
  const { connectionId } = req.params;

  try {
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ error: "Connection request not found." });
    }

    if (connection.recipient.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized." });
    }

    connection.status = "REJECTED";
    await connection.save();

    return res.status(200).json({
      message: "Connection request rejected.",
      connection,
    });
  } catch (error) {
    console.error("Error rejecting connection:", error);
    return res.status(500).json({ error: "Failed to reject connection." });
  }
};

export const removeConnection = async (req, res) => {
  const userId = req.userId;
  const { connectionId } = req.params;

  try {
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found." });
    }

    const isParticipant =
      connection.requester.toString() === userId ||
      connection.recipient.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized." });
    }

    await connection.deleteOne();

    return res
      .status(200)
      .json({ message: "Connection removed successfully." });
  } catch (error) {
    console.error("Error removing connection:", error);
    return res.status(500).json({ error: "Failed to remove connection." });
  }
};

export const getConnections = async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.userId;

  try {
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: "ACCEPTED" },
        { recipient: userId, status: "ACCEPTED" },
      ],
    })
      .populate("requester", "name email avatarUrl")
      .populate("recipient", "name email avatarUrl");

    const connectionsList = connections.map((conn) => {
      return conn.requester._id.toString() === userId
        ? conn.recipient
        : conn.requester;
    });

    return res.status(200).json({
      connections: connectionsList,
      count: connectionsList.length,
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return res.status(500).json({ error: "Failed to fetch connections." });
  }
};

export const getConnectionStatus = async (req, res) => {
  const requesterId = req.userId;
  const { userId } = req.params;

  try {
    const connection = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: userId },
        { requester: userId, recipient: requesterId },
      ],
    });

    if (!connection) {
      return res.status(200).json({ status: "NONE", connection: null });
    }

    const isSent = connection.requester.toString() === requesterId;

    return res.status(200).json({
      status: connection.status,
      connection,
      isSent,
      isReceived: !isSent,
    });
  } catch (error) {
    console.error("Error checking connection status:", error);
    return res
      .status(500)
      .json({ error: "Failed to check connection status." });
  }
};

export const getSuggestedConnections = async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const limit = parseInt(req.query.limit) || 10;

    const existingConnections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient");

    const connectedUserIds = existingConnections.map((conn) =>
      conn.requester.toString() === userId ? conn.recipient : conn.requester
    );

    const excludeIds = [
      ...connectedUserIds,
      new mongoose.Types.ObjectId(userId),
    ];

    const suggestions = await User.find({
      _id: { $nin: excludeIds },
      role: { $ne: "CHILD" },
    })
      .select("firstName lastName email avatar profileHeadline")
      .limit(limit)
      .lean();

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions." });
  }
};
