import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

import {
  createPlaylist,
  getPlaylistDetails,
  getUserPlaylists,
  updatePlaylistDetails,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
} from "../controllers/playlist.controller.js";

const router = express.Router();

router.post("/create", protect, createPlaylist);

router.get("/get-playlists", protect, getUserPlaylists);

router.get("/:playlistId", protect, getPlaylistDetails);

router.put("/:playlistId", protect, updatePlaylistDetails);

router.post("/:playlistId/add", protect, addVideoToPlaylist);

router.post("/:playlistId/remove", protect, removeVideoFromPlaylist);

router.delete("/:playlistId", protect, deletePlaylist);

export default router;
