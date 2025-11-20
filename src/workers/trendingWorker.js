import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URL, {
  dbName: process.env.MONGODB_DB || undefined,
});

import { redis } from "../utils/redis.js";
import FeatureStore from "../utils/featureStore.js";
import Video from "../models/video.model.js";
import { Post } from "../models/post.model.js";

const TRENDING_KEY = "trending:global";
const MAX_TOP = 500;

async function computeAndPublish() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 2);

    const [videos, posts] = await Promise.all([
      Video.find({ createdAt: { $gte: since }, visibility: "PUBLIC" }).lean(),
      Post.find({
        createdAt: { $gte: since },
        visibility: "PUBLIC",
        postTarget: "PROFILE",
      }).lean(),
    ]);

    const all = [...videos, ...posts];

    if (!all.length) {
      console.log("No recent items found for trending.");
      return;
    }

    const pipeline = redis.pipeline();
    for (const item of all) {
      const id = item._id.toString();
      pipeline.get(`cached:post:${id}:h1`);
      pipeline.get(`cached:post:${id}:h24`);
    }
    const results = await pipeline.exec();

    const scores = [];
    for (let i = 0; i < all.length; i++) {
      const item = all[i];
      const id = item._id.toString();

      const r1 = results[i * 2];
      const r24 = results[i * 2 + 1];

      const h1raw = r1 && r1[1] ? r1[1] : "0";
      const h24raw = r24 && r24[1] ? r24[1] : "0";

      let h1 = parseInt(h1raw, 10) || 0;
      let h24 = parseInt(h24raw, 10) || 0;

      if (h1 === 0) {
        h1 = await FeatureStore.sumBuckets(id, "views", 60);
        await redis.set(`cached:post:${id}:h1`, String(h1), { ex: 60 * 5 });
      }

      if (h24 === 0) {
        h24 = await FeatureStore.sumBuckets(id, "views", 60 * 24);
        await redis.set(`cached:post:${id}:h24`, String(h24), { ex: 60 * 10 });
      }

      const velocity = h24 > 0 ? h1 / Math.max(1, h24 / 24) : h1;
      const recencyMinutes =
        (Date.now() - new Date(item.createdAt).getTime()) / 60000;
      const recencyBoost = Math.max(0, (1440 - recencyMinutes) / 1440);
      const views = item.stats?.views || item.viewsCount || 0;
      const score = velocity * Math.log(views + 2) * (1 + recencyBoost);

      if (!Number.isFinite(score)) continue;
      scores.push({ id, score });
    }

    const top = scores.sort((a, b) => b.score - a.score).slice(0, MAX_TOP);
    if (!top.length) {
      console.log("No scored items to publish.");
      return;
    }

    const members = top.map((t) => ({
      score: t.score,
      member: t.id,
    }));

    await redis.del(TRENDING_KEY);
    await redis.zadd(TRENDING_KEY, ...members);
    await redis.expire(TRENDING_KEY, 60 * 10);

    console.log(`Trending updated — published ${top.length} items.`);
  } catch (err) {
    console.error("Trending worker error:", err);
  }
}

async function start() {
  await computeAndPublish();
  setInterval(computeAndPublish, 60 * 1000);
}

start().catch((e) => {
  console.error("Failed to start trending worker:", e);
  process.exit(1);
});
