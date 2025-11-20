import { redis } from "./redis.js";

export const FeedCache = {
  async get(feedType, userId, page) {
    const key = `feed:${feedType}:${userId}:${page}`;
    const cached = await redis.get(key);
    return cached ?? null;
  },

  async set(feedType, userId, page, data, ttlSec = 15) {
    const key = `feed:${feedType}:${userId}:${page}`;
    await redis.set(key, data, { ex: ttlSec });
  },

  async invalidateUser(userId) {},
};
