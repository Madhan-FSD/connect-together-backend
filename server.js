import express from "express";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import childRoutes from "./src/routes/child.routes.js";
import channelRoutes from "./src/routes/channel.routes.js";
import postsRoutes from "./src/routes/posts.routes.js";
import { startAiTasks } from "./src/utils/aiUtils.js";
import userRoutes from "./src/routes/user.routes.js";
import aiRoutes from "./src/routes/ai.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import aiGamesRoutes from "./src/routes/aigames.routes.js";
import childProfileRoutes from "./src/routes/child.profile.routes.js";
import connectionsRoutes from "./src/routes/connections.routes.js";
import followersRoutes from "./src/routes/followers.routes.js";
import feedsRoutes from "./src/routes/feed.routes.js";
import followingRoutes from "./src/routes/following.routes.js";
import gameReportsRoutes from "./src/routes/game.reports.routes.js";
import reactionRoutes from "./src/routes/reaction.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import playlistsRoutes from "./src/routes/playlist.routes.js";
import videoRoutes from "./src/routes/video.routes.js";
import eventRoutes from "./src/routes/events.route.js";
import curatedRoutes from "./src/routes/curated.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
mongoose
  .connect(process.env.MONGO_URL, {})
  .then(() => {
    startAiTasks();
    console.log("AI scheduled tasks initialized.");
    app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connect error", err);
  });

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  res.send("API is running! Check /api/* endpoints.");
});

app.use("/api/auth", authRoutes);
app.use("/api/child", childRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users/profile", profileRoutes);
app.use("/api/ai/games", aiGamesRoutes);
app.use("/api/child/profile", childProfileRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/feeds", feedsRoutes);
app.use("/api/followers", followersRoutes);
app.use("/api/following", followingRoutes);
app.use("/api/reports", gameReportsRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/playlists", playlistsRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/curated", curatedRoutes);
