import Follower from "../models/follower.model.js";
import UserChannel from "../models/userchannel.model.js";
import { User } from "../models/user.model.js";
import ChildChannel from "../models/childchannel.model.js";

export const followEntity = async (req, res) => {
  const followerId = req.userId;
  const { entityId, entityType } = req.body;

  if (!entityId || !entityType) {
    return res.status(400).json({ error: "Entity ID and type are required." });
  }

  if (!["USER", "USER_CHANNEL", "CHILD_CHANNEL"].includes(entityType)) {
    return res.status(400).json({ error: "Invalid entity type." });
  }

  try {
    let entity;
    if (entityType === "USER") {
      entity = await User.findById(entityId);
    } else if (entityType === "USER_CHANNEL") {
      entity = await UserChannel.findById(entityId);
    } else if (entityType === "CHILD_CHANNEL") {
      entity = await ChildChannel.findById(entityId);
    }

    if (!entity) {
      return res.status(404).json({ error: "Entity not found." });
    }

    if (entityType === "USER" && entityId === followerId) {
      return res.status(400).json({ error: "Cannot follow yourself." });
    }

    const existingFollow = await Follower.findOne({
      follower: followerId,
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    if (existingFollow) {
      return res.status(400).json({ error: "Already following this entity." });
    }

    const newFollow = await Follower.create({
      follower: followerId,
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    return res.status(201).json({
      message: "Successfully followed.",
      follow: newFollow,
    });
  } catch (error) {
    console.error("Error following entity:", error);
    return res.status(500).json({
      error: "Failed to follow entity.",
      details: error.message,
    });
  }
};

export const unfollowEntity = async (req, res) => {
  const followerId = req.userId;
  const { entityId, entityType } = req.body;

  if (!entityId || !entityType) {
    return res.status(400).json({ error: "Entity ID and type are required." });
  }

  try {
    const follow = await Follower.findOneAndDelete({
      follower: followerId,
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    if (!follow) {
      return res.status(404).json({ error: "Follow relationship not found." });
    }

    return res.status(200).json({ message: "Successfully unfollowed." });
  } catch (error) {
    console.error("Error unfollowing entity:", error);
    return res.status(500).json({ error: "Failed to unfollow entity." });
  }
};

export const getFollowers = async (req, res) => {
  const { entityId, entityType } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const followers = await Follower.find({
      followedEntity: entityId,
      followedEntityType: entityType,
    })
      .populate("follower", "name email avatarUrl")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalFollowers = await Follower.countDocuments({
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    return res.status(200).json({
      followers: followers.map((f) => f.follower),
      pagination: {
        total: totalFollowers,
        page,
        limit,
        totalPages: Math.ceil(totalFollowers / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    return res.status(500).json({ error: "Failed to fetch followers." });
  }
};

export const getFollowing = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const following = await Follower.find({ follower: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalFollowing = await Follower.countDocuments({ follower: userId });

    const populated = await Promise.all(
      following.map(async (follow) => {
        let entity;
        if (follow.followedEntityType === "USER") {
          entity = await User.findById(follow.followedEntity).select(
            "name email avatarUrl"
          );
        } else if (follow.followedEntityType === "USER_CHANNEL") {
          entity = await UserChannel.findById(follow.followedEntity).select(
            "name handle avatarUrl"
          );
        } else if (follow.followedEntityType === "CHILD_CHANNEL") {
          entity = await ChildChannel.findById(follow.followedEntity).select(
            "name handle avatarUrl"
          );
        }

        return {
          ...follow.toObject(),
          entity,
        };
      })
    );

    return res.status(200).json({
      following: populated,
      pagination: {
        total: totalFollowing,
        page,
        limit,
        totalPages: Math.ceil(totalFollowing / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching following:", error);
    return res.status(500).json({ error: "Failed to fetch following." });
  }
};

export const checkFollowStatus = async (req, res) => {
  const userId = req.userId;
  const { entityId, entityType } = req.params;

  try {
    const isFollowing = await Follower.exists({
      follower: userId,
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    return res.status(200).json({ isFollowing: !!isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({ error: "Failed to check follow status." });
  }
};

export const getFollowerCount = async (req, res) => {
  const { entityId, entityType } = req.params;

  try {
    const count = await Follower.countDocuments({
      followedEntity: entityId,
      followedEntityType: entityType,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Error getting follower count:", error);
    return res.status(500).json({ error: "Failed to get follower count." });
  }
};
