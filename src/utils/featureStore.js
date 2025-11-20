import { redis } from "./redis.js";

const BUCKET_TTL_SECONDS = 60 * 60 * 48;

export default {
  async setUserFeatures(userId, obj, ttlSec = 60 * 30) {
    const key = `feat:user:${userId}:global`;
    await redis.set(key, JSON.stringify(obj), { ex: ttlSec });
  },

  async getUserFeatures(userId) {
    const key = `feat:user:${userId}:global`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : {};
  },

  async setUserPostFeature(userId, postId, obj, ttlSec = 60 * 60) {
    const key = `feat:user:${userId}:post:${postId}`;
    await redis.set(key, JSON.stringify(obj), { ex: ttlSec });
  },

  async getUserPostFeature(userId, postId) {
    const key = `feat:user:${userId}:post:${postId}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : {};
  },

  async incrementCounter(postId, eventType = "views", amount = 1) {
    const now = Date.now();
    const minuteBucket = Math.floor(now / (60 * 1000));
    const key = `counters:post:${postId}:${eventType}:bucket:${minuteBucket}`;
    await redis.incrby(key, amount);
    await redis.expire(key, BUCKET_TTL_SECONDS);
  },

  async sumBuckets(postId, eventType = "views", minutes = 60) {
    const now = Math.floor(Date.now() / (60 * 1000));
    const keys = [];
    for (let i = 0; i < minutes; i++) {
      keys.push(`counters:post:${postId}:${eventType}:bucket:${now - i}`);
    }
    const vals = await redis.mget(...keys);
    let sum = 0;
    for (const v of vals) {
      sum += parseInt(v || "0", 10);
    }
    return sum;
  },
};
