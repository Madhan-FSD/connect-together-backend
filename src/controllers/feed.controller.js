import mongoose from "mongoose";
import Video from "../models/video.model.js";
import { Post } from "../models/post.model.js";
import Follower from "../models/follower.model.js";
import Connection from "../models/connections.model.js";
import { FeedCache } from "../utils/feedCache.js";
import UserChannel from "../models/userchannel.model.js";
import ChildChannel from "../models/childchannel.model.js";
import { User } from "../models/user.model.js";
import { getMLScore } from "../utils/mlClient.js";
import { buildFeaturePayload } from "../utils/buildFeaturePayload.js";

const enrichItemsWithChannelInfo = async (items, userId) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const channelIdSet = new Set();
  const ownerIdSet = new Set();

  for (const it of items) {
    if (it.channelId) {
      try {
        channelIdSet.add(it.channelId.toString());
      } catch (e) {}
    }
    if (it.ownerId) {
      try {
        ownerIdSet.add(
          typeof it.ownerId === "string" ? it.ownerId : it.ownerId.toString()
        );
      } catch (e) {}
    }
  }

  const channelIds = Array.from(channelIdSet);
  const ownerIds = Array.from(ownerIdSet);

  const channelObjectIds = channelIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const ownerObjectIds = ownerIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const channelsById = {};
  if (channelObjectIds.length) {
    const userChannels = await UserChannel.find({
      _id: { $in: channelObjectIds },
    })
      .lean()
      .exec();
    const childChannels = await ChildChannel.find({
      _id: { $in: channelObjectIds },
    })
      .lean()
      .exec();
    for (const c of userChannels) {
      channelsById[c._id.toString()] = { doc: c, type: "UserChannel" };
    }
    for (const c of childChannels) {
      channelsById[c._id.toString()] = { doc: c, type: "ChildChannel" };
    }
  }

  const usersById = {};
  if (ownerObjectIds.length) {
    const users = await User.find({
      _id: { $in: ownerObjectIds },
    })
      .lean()
      .exec();
    for (const u of users) {
      usersById[u._id.toString()] = u;
    }
  }

  const allEntityIds = [
    ...new Set([
      ...channelObjectIds.map(String),
      ...ownerObjectIds.map(String),
    ]),
  ].map((s) => new mongoose.Types.ObjectId(s));

  let subscriptionMap = {};
  if (userId && allEntityIds.length) {
    const followerDocs = await Follower.find({
      follower: userId,
      followedEntity: { $in: allEntityIds },
    })
      .lean()
      .exec();
    subscriptionMap = followerDocs.reduce((acc, f) => {
      if (f.followedEntity) acc[f.followedEntity.toString()] = true;
      return acc;
    }, {});
  }

  const normalized = items.map((raw) => {
    const item = { ...raw };
    const channelIdStr = item.channelId ? item.channelId.toString() : null;
    const ownerIdStr =
      item.ownerId && typeof item.ownerId === "object" && item.ownerId._id
        ? item.ownerId._id.toString()
        : item.ownerId
        ? item.ownerId.toString()
        : null;

    const ch = channelIdStr ? channelsById[channelIdStr] : null;
    if (ch && ch.doc) {
      item.channelId = ch.doc._id;
      item.channelType = ch.type;
      item.channelName = ch.doc.name || ch.doc.handle || "";
      item.channelHandle = ch.doc.handle || "";
      item.channelAvatar = ch.doc.avatarUrl || "";
      item.channelDescription = ch.doc.description || "";
      item.isSubscribed = !!subscriptionMap[ch.doc._id.toString()];
    } else if (ownerIdStr && usersById[ownerIdStr]) {
      const u = usersById[ownerIdStr];
      item.channelId = item.channelId || null;
      item.channelType = "UserProfile";
      item.channelName = u.firstName
        ? `${u.firstName} ${u.lastName || ""}`.trim()
        : u.displayName || u.handle || "";
      item.channelHandle = u.handle || "";
      item.channelAvatar = u.avatar || "";
      item.channelDescription = u.headline || u.bio || "";
      item.isSubscribed = !!subscriptionMap[u._id.toString()];
    } else {
      item.channelId = item.channelId || null;
      item.channelType = item.channelType || null;
      item.channelName =
        item.channelName ||
        (item.ownerId && item.ownerId.firstName
          ? `${item.ownerId.firstName} ${item.ownerId.lastName || ""}`.trim()
          : item.ownerName || "");
      item.channelHandle =
        item.channelHandle || (item.ownerId && item.ownerId.handle) || "";
      item.channelAvatar =
        item.channelAvatar || (item.ownerId && item.ownerId.avatar) || "";
      item.channelDescription = item.channelDescription || "";
      const entId = channelIdStr || ownerIdStr;
      item.isSubscribed = !!(entId && subscriptionMap[entId]);
    }

    item.restricted =
      (item.visibility && item.visibility !== "PUBLIC") || false;
    return item;
  });

  return normalized;
};

export const getSubscriptionsFeed = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const refresh = req.query.refresh === "1";

  try {
    const cacheKey = `subscriptions`;

    if (!refresh) {
      const cached = await FeedCache.get(cacheKey, userId, page);
      if (cached) return res.status(200).json(cached);
    }

    const followed = await Follower.find({ follower: userId }).lean().exec();

    const channelIds = [];
    const ownerIds = [];

    for (const f of followed) {
      if (!f.followedEntity) continue;
      const type = (f.followedEntityType || "").toUpperCase();
      if (
        type === "USER_CHANNEL" ||
        type === "CHILD_CHANNEL" ||
        type === "CHANNEL"
      ) {
        channelIds.push(f.followedEntity);
      } else {
        ownerIds.push(f.followedEntity);
      }
    }

    if (!channelIds.length && !ownerIds.length) {
      const empty = {
        items: [],
        pagination: { total: 0, totalPages: 0, page, limit },
      };
      await FeedCache.set(cacheKey, userId, page, empty, 20);
      return res.status(200).json(empty);
    }

    const channelObjectIds = channelIds
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const ownerObjectIds = ownerIds
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const fetchLimit = Math.max(50, limit * 2);

    const visibilityQuery = {
      $or: [
        { visibility: "PUBLIC" },
        { visibility: "SUBSCRIBERS_ONLY" },
        { ownerId: userId },
      ],
    };

    const [channelVideos, profileVideos, channelPosts, profilePosts] =
      await Promise.all([
        channelObjectIds.length
          ? Video.find({
              channelId: { $in: channelObjectIds },
              videoStatus: "LIVE",
              ...visibilityQuery,
            })
              .sort({ createdAt: -1 })
              .limit(fetchLimit)
              .lean()
          : [],
        ownerObjectIds.length
          ? Video.find({
              ownerId: { $in: ownerObjectIds },
              contentType: "VIDEO_PROFILE",
              videoStatus: "LIVE",
              ...visibilityQuery,
            })
              .sort({ createdAt: -1 })
              .limit(fetchLimit)
              .lean()
          : [],
        channelObjectIds.length
          ? Post.find({
              channelId: { $in: channelObjectIds },
              postTarget: "CHANNEL",
              ...visibilityQuery,
            })
              .sort({ createdAt: -1 })
              .limit(fetchLimit)
              .lean()
          : [],
        ownerObjectIds.length
          ? Post.find({
              ownerId: { $in: ownerObjectIds },
              postTarget: "PROFILE",
              ...visibilityQuery,
            })
              .sort({ createdAt: -1 })
              .limit(fetchLimit)
              .lean()
          : [],
      ]);

    const merged = [
      ...channelVideos,
      ...profileVideos,
      ...channelPosts,
      ...profilePosts,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = merged.length;
    const totalPages = Math.ceil(total / limit);

    const paginated = merged.slice(
      (page - 1) * limit,
      (page - 1) * limit + limit
    );

    const enriched = await enrichItemsWithChannelInfo(paginated, userId);

    const response = {
      items: enriched,
      pagination: { total, page, limit, totalPages },
    };

    await FeedCache.set(cacheKey, userId, page, response, 20);

    return res.status(200).json(response);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch subscriptions feed." });
  }
};

export const getPersonalizedFeed = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;

  try {
    const cacheKey = "personalized";
    const cached = await FeedCache.get(cacheKey, userId, page);
    if (cached) return res.status(200).json(cached);

    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "ACCEPTED",
    })
      .lean()
      .exec();

    const connectedUserIds = connections.map((c) =>
      c.requester.toString() === userId ? c.recipient : c.requester
    );

    const followed = await Follower.find({ follower: userId }).lean().exec();

    const followedChannelIds = followed
      .filter((f) =>
        (f.followedEntityType || "").toUpperCase().includes("CHANNEL")
      )
      .map((f) => f.followedEntity.toString());

    const followedOwnerIds = followed
      .filter(
        (f) =>
          !f.followedEntityType ||
          f.followedEntityType === "USER" ||
          f.followedEntityType === "PROFILE"
      )
      .map((f) => f.followedEntity.toString());

    const fetchLimit = Math.max(100, limit * 5);

    const visibilityQuery = {
      $or: [
        { visibility: "PUBLIC" },
        { visibility: "SUBSCRIBERS_ONLY" },
        { ownerId: userId },
      ],
    };

    const [
      subscribedChannelVideos,
      subscribedProfileVideos,
      subscribedChannelPosts,
      subscribedProfilePosts,
      connectedVideos,
      connectedPosts,
      recommendedVideos,
      recommendedPosts,
    ] = await Promise.all([
      Video.find({
        channelId: { $in: followedChannelIds },
        videoStatus: "LIVE",
        ...visibilityQuery,
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Video.find({
        ownerId: { $in: followedOwnerIds },
        videoStatus: "LIVE",
        ...visibilityQuery,
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Post.find({
        channelId: { $in: followedChannelIds },
        postTarget: "CHANNEL",
        ...visibilityQuery,
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Post.find({
        ownerId: { $in: followedOwnerIds },
        postTarget: "PROFILE",
        ...visibilityQuery,
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Video.find({
        ownerId: { $in: connectedUserIds },
        videoStatus: "LIVE",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Post.find({
        ownerId: { $in: connectedUserIds },
        postTarget: "PROFILE",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Video.find({
        ownerId: {
          $nin: [
            ...connectedUserIds.map(String),
            ...followedOwnerIds.map(String),
            userId.toString(),
          ],
        },
        videoStatus: "LIVE",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),

      Post.find({
        ownerId: {
          $nin: [
            ...connectedUserIds.map(String),
            ...followedOwnerIds.map(String),
            userId.toString(),
          ],
        },
        postTarget: "PROFILE",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),
    ]);

    const merged = [
      ...subscribedChannelVideos,
      ...subscribedProfileVideos,
      ...subscribedChannelPosts,
      ...subscribedProfilePosts,
      ...connectedVideos,
      ...connectedPosts,
      ...recommendedVideos,
      ...recommendedPosts,
    ];

    const normalizeId = (id) => {
      try {
        return typeof id === "string" ? id : id.toString();
      } catch {
        return "";
      }
    };

    const uniqueMap = new Map();
    for (const item of merged) {
      const id = normalizeId(item._id);
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, item);
      }
    }

    const unique = Array.from(uniqueMap.values());

    const scored = [];
    for (const item of unique) {
      try {
        const features = await buildFeaturePayload(userId, item);
        const score = await getMLScore(features);
        scored.push({ ...item, score });
      } catch {
        scored.push({ ...item, score: 0 });
      }
    }

    scored.sort((a, b) => (b.score || 0) - (a.score || 0));

    const paginated = scored.slice((page - 1) * limit, page * limit);
    const enriched = await enrichItemsWithChannelInfo(paginated, userId);

    const response = {
      items: enriched,
      pagination: { page, limit, total: scored.length },
    };

    await FeedCache.set(cacheKey, userId, page, response, 15);

    return res.status(200).json(response);
  } catch {
    return res
      .status(500)
      .json({ error: "Failed to fetch personalized feed." });
  }
};

export const getExploreFeed = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;

  try {
    const cacheKey = "explore";
    const cached = await FeedCache.get(cacheKey, userId, page);
    if (cached) return res.status(200).json(cached);

    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "ACCEPTED",
    })
      .lean()
      .exec();

    const connectedUserIds = connections.map((c) =>
      c.requester.toString() === userId ? c.recipient : c.requester
    );

    const followed = await Follower.find({ follower: userId }).lean().exec();

    const followedChannelIds = followed
      .filter(
        (f) => f.followedEntityType && f.followedEntityType.includes("CHANNEL")
      )
      .map((f) => f.followedEntity);

    const excludedUsers = [...connectedUserIds.map(String), userId.toString()];
    const excludedChannels = followedChannelIds.map(String);

    const fetchLimit = Math.max(80, limit * 6);

    const [profilePosts, channelPosts, videos] = await Promise.all([
      Post.find({
        ownerId: { $nin: excludedUsers },
        postTarget: "PROFILE",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean()
        .exec(),

      Post.find({
        channelId: { $nin: excludedChannels },
        postTarget: "CHANNEL",
        visibility: "PUBLIC",
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean()
        .exec(),

      Video.find({
        visibility: "PUBLIC",
        videoStatus: "LIVE",
        ownerId: { $nin: excludedUsers },
        channelId: { $nin: excludedChannels },
      })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean()
        .exec(),
    ]);

    const merged = [...videos, ...profilePosts, ...channelPosts];

    const scored = [];
    for (const item of merged) {
      try {
        const features = await buildFeaturePayload(userId, item);
        const score = await getMLScore(features);
        scored.push({ ...item, score });
      } catch {
        scored.push({ ...item, score: 0 });
      }
    }

    scored.sort((a, b) => (b.score || 0) - (a.score || 0));

    const paginated = scored.slice((page - 1) * limit, page * limit);
    const enriched = await enrichItemsWithChannelInfo(paginated, userId);

    const response = {
      items: enriched,
      pagination: { page, limit, total: scored.length },
    };

    await FeedCache.set(cacheKey, userId, page, response, 20);

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({ error: "Failed to fetch explore feed." });
  }
};

export const getTrending = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 12;
  const userId = req.userId;

  try {
    const cacheKey = "trending";
    const cached = await FeedCache.get(cacheKey, "global", 1);
    if (cached) return res.status(200).json(cached);

    const sinceDays = parseInt(req.query.days, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const [trendVideos, trendProfilePosts, trendChannelPosts] =
      await Promise.all([
        Video.find({
          createdAt: { $gte: since },
          visibility: "PUBLIC",
          videoStatus: "LIVE",
        })
          .sort({ viewsCount: -1, likesCount: -1 })
          .limit(limit)
          .lean()
          .exec(),

        Post.find({
          createdAt: { $gte: since },
          postTarget: "PROFILE",
          visibility: "PUBLIC",
        })
          .sort({ likesCount: -1, commentsCount: -1 })
          .limit(limit)
          .lean()
          .exec(),

        Post.find({
          createdAt: { $gte: since },
          postTarget: "CHANNEL",
          visibility: "PUBLIC",
        })
          .sort({ likesCount: -1, commentsCount: -1 })
          .limit(limit)
          .lean()
          .exec(),
      ]);

    const enrichedVideos = await enrichItemsWithChannelInfo(
      trendVideos,
      userId
    );
    const enrichedProfile = await enrichItemsWithChannelInfo(
      trendProfilePosts,
      userId
    );
    const enrichedChannel = await enrichItemsWithChannelInfo(
      trendChannelPosts,
      userId
    );

    const response = {
      videos: enrichedVideos,
      profilePosts: enrichedProfile,
      channelPosts: enrichedChannel,
    };

    await FeedCache.set(cacheKey, "global", 1, response, 30);

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({ error: "Failed to fetch trending content." });
  }
};
