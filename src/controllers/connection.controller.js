import Connection from "../models/connections.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const USER_POPULATION_FIELDS =
  "firstName lastName email avatar profileHeadline connectionCount";

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
        if (existingConnection.requester.toString() === requesterId) {
          return res
            .status(400)
            .json({ error: "Connection request already sent." });
        } else {
          return res.status(400).json({
            error:
              "You have a pending request from this user. Please accept or reject it.",
          });
        }
      }
      if (existingConnection.status === "BLOCKED") {
        return res
          .status(403)
          .json({ error: "Cannot send connection request." });
      }
      if (
        existingConnection.status === "REJECTED" &&
        existingConnection.requester.toString() === requesterId
      ) {
        return res.status(400).json({
          error:
            "You have already rejected this user's request, or your previous request was rejected.",
        });
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
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const requests = await Connection.find({
      recipient: userId,
      status: "PENDING",
    })
      .populate("requester", USER_POPULATION_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRequests = await Connection.countDocuments({
      recipient: userId,
      status: "PENDING",
    });

    return res.status(200).json({
      requests,
      total: totalRequests,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalRequests / limit),
    });
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

    if (connection.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Request already processed or is not pending." });
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

export const blockUser = async (req, res) => {
  const blockerId = req.userId;
  const { userIdToBlock } = req.body;

  if (!userIdToBlock) {
    return res.status(400).json({ error: "User ID to block is required." });
  }

  if (blockerId === userIdToBlock) {
    return res.status(400).json({ error: "Cannot block yourself." });
  }

  try {
    const blockedUser = await User.findById(userIdToBlock);
    if (!blockedUser) {
      return res.status(404).json({ error: "User to block not found." });
    }

    let connection = await Connection.findOne({
      $or: [
        { requester: blockerId, recipient: userIdToBlock },
        { requester: userIdToBlock, recipient: blockerId },
      ],
    });

    if (connection) {
      const oldStatus = connection.status;
      connection.status = "BLOCKED";

      if (connection.recipient.toString() === blockerId) {
        connection.requester = blockerId;
        connection.recipient = userIdToBlock;
      }

      await connection.save();

      if (oldStatus === "ACCEPTED") {
        await User.updateMany(
          { _id: { $in: [blockerId, userIdToBlock] } },
          { $inc: { connectionCount: -1 } }
        );
      }
    } else {
      connection = await Connection.create({
        requester: blockerId,
        recipient: userIdToBlock,
        status: "BLOCKED",
        requestMessage: "User blocked",
      });
    }

    return res.status(200).json({
      message: "User blocked successfully.",
      connection,
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(500).json({ error: "Failed to block user." });
  }
};

export const getConnections = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: "ACCEPTED" },
        { recipient: userId, status: "ACCEPTED" },
      ],
    })
      .populate("requester", USER_POPULATION_FIELDS)
      .populate("recipient", USER_POPULATION_FIELDS)
      .skip(skip)
      .limit(parseInt(limit));

    const connectionsList = connections.map((conn) => {
      const connectedUser =
        conn.requester._id.toString() === userId
          ? conn.recipient
          : conn.requester;

      return connectedUser.toObject ? connectedUser.toObject() : connectedUser;
    });

    const totalConnections = await Connection.countDocuments({
      $or: [
        { requester: userId, status: "ACCEPTED" },
        { recipient: userId, status: "ACCEPTED" },
      ],
    });

    return res.status(200).json({
      connections: connectionsList,
      total: totalConnections,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalConnections / limit),
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
    }).select("requester recipient status");

    if (!connection) {
      return res.status(200).json({
        status: "NONE",
        connection: null,
        isSent: false,
        isReceived: false,
      });
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
    const authenticatedUserId = req.userId;
    const { limit, childId } = req.query;
    const connectionLimit = parseInt(limit) || 10;

    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      return res.status(400).json({ error: "Invalid authenticated user ID" });
    }

    let targetUserId = authenticatedUserId;
    let targetUserRole = "NORMAL_USER";

    if (childId) {
      if (!mongoose.Types.ObjectId.isValid(childId)) {
        return res.status(400).json({ error: "Invalid child ID" });
      }

      const parentUser = await User.findById(authenticatedUserId).select(
        "role children"
      );

      const isParentOfChild = parentUser?.children.some(
        (child) => child._id.toString() === childId
      );

      if (parentUser?.role !== "PARENT" || !isParentOfChild) {
        return res.status(403).json({
          error: "Access denied. Cannot fetch suggestions for this child.",
        });
      }

      targetUserId = childId;
      targetUserRole = "CHILD";
    }

    const existingConnections = await Connection.find({
      $or: [{ requester: targetUserId }, { recipient: targetUserId }],
    }).select("requester recipient status");

    const connectedAndPendingIds = existingConnections.reduce((acc, conn) => {
      if (conn.status !== "REJECTED" && conn.status !== "BLOCKED") {
        const otherId =
          conn.requester.toString() === targetUserId
            ? conn.recipient
            : conn.requester;
        acc.push(otherId);
      }
      return acc;
    }, []);

    const excludeIds = [
      ...connectedAndPendingIds,
      new mongoose.Types.ObjectId(targetUserId),
      new mongoose.Types.ObjectId(authenticatedUserId),
    ];

    const suggestions = await User.find({
      _id: { $nin: excludeIds },

      role: targetUserRole === "CHILD" ? "CHILD" : { $ne: "CHILD" },
    })
      .select("firstName lastName email avatar profileHeadline connectionCount")
      .sort({ connectionCount: -1 })
      .limit(connectionLimit)
      .lean();

    res
      .status(200)
      .json({ suggestions, isChildContext: targetUserRole === "CHILD" });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions." });
  }
};

export const getSentPendingRequests = async (req, res) => {
  const userId = req.userId;
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const requests = await Connection.find({
      requester: userId,
      status: "PENDING",
    })

      .populate("recipient", USER_POPULATION_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRequests = await Connection.countDocuments({
      requester: userId,
      status: "PENDING",
    });

    return res.status(200).json({
      requests,
      total: totalRequests,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalRequests / limit),
    });
  } catch (error) {
    console.error("Error fetching sent pending requests:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch sent pending requests." });
  }
};
