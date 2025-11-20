import { Playlist } from "../models/playlist.model.js";
import Video from "../models/video.model.js";

export const createPlaylist = async (req, res) => {
  const userId = req.userId;
  const { name, description, playlistVisibility } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Playlist name is required." });
  }

  try {
    const newPlaylist = await Playlist.create({
      name,
      description: description || "",
      playlistVisibility: playlistVisibility || "PUBLIC",
      owner: userId,
    });

    return res.status(201).json({
      message: "Playlist created successfully.",
      playlist: newPlaylist,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create playlist." });
  }
};

export const getPlaylistDetails = async (req, res) => {
  const { playlistId } = req.params;
  const viewerId = req.userId;

  try {
    const playlist = await Playlist.findById(playlistId)
      .populate("owner", "username")
      .populate({
        path: "videos",
        select: "title duration thumbnailUrl secureUrl viewsCount visibility",
      });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    const owner = playlist.owner._id.toString() === viewerId?.toString();

    if (playlist.playlistVisibility === "PRIVATE" && !owner) {
      return res.status(403).json({ error: "Private playlist." });
    }

    if (playlist.playlistVisibility === "SUBSCRIBERS_ONLY") {
      const Follower = (await import("../models/follower.model.js")).default;
      const isSub = await Follower.findOne({
        follower: viewerId,
        followedEntity: playlist.owner._id,
        followedEntityType: "USER_CHANNEL",
      });
      if (!isSub && !owner) {
        return res.status(403).json({ error: "Subscribers only playlist." });
      }
    }

    if (playlist.playlistVisibility === "PAID_ONLY") {
      const hasPaid = false;
      if (!hasPaid && !owner) {
        return res.status(403).json({ error: "Paid only playlist." });
      }
    }

    return res.status(200).json({ playlist });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to retrieve playlist details." });
  }
};

export const getUserPlaylists = async (req, res) => {
  const userId = req.userId;

  try {
    const playlists = await Playlist.find({ owner: userId }).select(
      "name description playlistVisibility videos"
    );

    return res.status(200).json({ playlists });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve playlists." });
  }
};

export const updatePlaylistDetails = async (req, res) => {
  const userId = req.userId;
  const { playlistId } = req.params;
  const { name, description, playlistVisibility } = req.body;

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (playlist.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;

    if (playlistVisibility) {
      if (
        !["PUBLIC", "PRIVATE", "SUBSCRIBERS_ONLY", "PAID_ONLY"].includes(
          playlistVisibility
        )
      ) {
        return res.status(400).json({ error: "Invalid playlist visibility." });
      }
      playlist.playlistVisibility = playlistVisibility;
    }

    await playlist.save();

    return res.status(200).json({
      message: "Playlist updated successfully.",
      playlist,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update playlist." });
  }
};

export const addVideoToPlaylist = async (req, res) => {
  const userId = req.userId;
  const { playlistId } = req.params;
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID is required." });
  }

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (playlist.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    const video = await Video.findById(videoId);
    if (!video || video.ownerId.toString() !== userId.toString()) {
      return res.status(404).json({ error: "Video not found." });
    }

    if (playlist.videos.includes(videoId)) {
      return res.status(409).json({ error: "Video already in playlist." });
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res.status(200).json({
      message: "Video added successfully.",
      playlist,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add video." });
  }
};

export const removeVideoFromPlaylist = async (req, res) => {
  const userId = req.userId;
  const { playlistId } = req.params;
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID is required." });
  }

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (playlist.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    const initialLength = playlist.videos.length;
    playlist.videos = playlist.videos.filter(
      (id) => id.toString() !== videoId.toString()
    );

    if (playlist.videos.length === initialLength) {
      return res.status(404).json({ error: "Video not in playlist." });
    }

    await playlist.save();

    return res.status(200).json({
      message: "Video removed successfully.",
      playlist,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to remove video." });
  }
};

export const deletePlaylist = async (req, res) => {
  const userId = req.userId;
  const { playlistId } = req.params;

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (playlist.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    await Playlist.deleteOne({ _id: playlistId });

    return res.status(200).json({ message: "Playlist deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete playlist." });
  }
};
