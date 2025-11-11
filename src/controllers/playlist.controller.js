import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";

export const createPlaylist = async (req, res) => {
  const userId = req.userId;
  const { name, description, isPublic } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Playlist name is required." });
  }

  try {
    const newPlaylist = await Playlist.create({
      name,
      description: description || "",
      isPublic: isPublic !== undefined ? isPublic : true,
      owner: userId,
    });

    return res.status(201).json({
      message: "Playlist created successfully.",
      playlist: newPlaylist,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({ error: "Failed to create playlist." });
  }
};

export const getPlaylistDetails = async (req, res) => {
  const { playlistId } = req.params;

  try {
    const playlist = await Playlist.findById(playlistId)
      .populate("owner", "username")
      .populate({
        path: "videos",
        select: "title duration thumbnailUrl secureUrl viewsCount",
      });

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (
      !playlist.isPublic &&
      playlist.owner.toString() !== req.userId.toString()
    ) {
      return res
        .status(403)
        .json({ error: "Access denied. This is a private playlist." });
    }

    return res.status(200).json({ playlist });
  } catch (error) {
    console.error("Error retrieving playlist details:", error);
    return res
      .status(500)
      .json({ error: "Failed to retrieve playlist details." });
  }
};

export const getUserPlaylists = async (req, res) => {
  const userId = req.userId;

  try {
    const playlists = await Playlist.find({ owner: userId }).select(
      "name description isPublic videos"
    );

    return res.status(200).json({ playlists });
  } catch (error) {
    console.error("Error retrieving user playlists:", error);
    return res.status(500).json({ error: "Failed to retrieve playlists." });
  }
};

export const updatePlaylistDetails = async (req, res) => {
  const userId = req.userId;
  const { playlistId } = req.params;
  const { name, description, isPublic } = req.body;

  if (!name && description === undefined && isPublic === undefined) {
    return res
      .status(400)
      .json({ error: "Provide at least one field to update." });
  }

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found." });
    }

    if (playlist.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to modify this playlist." });
    }

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();

    return res
      .status(200)
      .json({ message: "Playlist updated successfully.", playlist });
  } catch (error) {
    console.error("Error updating playlist details:", error);
    return res
      .status(500)
      .json({ error: "Failed to update playlist details." });
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
      return res
        .status(403)
        .json({ error: "Not authorized to modify this playlist." });
    }

    const video = await Video.findById(videoId);
    if (!video || video.ownerId.toString() !== userId.toString()) {
      return res
        .status(404)
        .json({ error: "Video not found or does not belong to your channel." });
    }

    if (playlist.videos.includes(videoId)) {
      return res
        .status(409)
        .json({ error: "Video is already in this playlist." });
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res
      .status(200)
      .json({ message: "Video added to playlist successfully.", playlist });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    return res.status(500).json({ error: "Failed to add video to playlist." });
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
      return res
        .status(403)
        .json({ error: "Not authorized to modify this playlist." });
    }

    const initialLength = playlist.videos.length;
    playlist.videos = playlist.videos.filter(
      (id) => id.toString() !== videoId.toString()
    );

    if (playlist.videos.length === initialLength) {
      return res
        .status(404)
        .json({ error: "Video was not found in this playlist." });
    }

    await playlist.save();

    return res
      .status(200)
      .json({ message: "Video removed from playlist successfully.", playlist });
  } catch (error) {
    console.error("Error removing video from playlist:", error);
    return res
      .status(500)
      .json({ error: "Failed to remove video from playlist." });
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
      return res
        .status(403)
        .json({ error: "Not authorized to delete this playlist." });
    }

    await Playlist.deleteOne({ _id: playlistId });

    return res.status(200).json({ message: "Playlist deleted successfully." });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({ error: "Failed to delete playlist." });
  }
};
