import pkg from "ffmpeg-extract-frame";
const { extractFrame } = pkg;
import path from "path";
import { promises as fs } from "fs";

export const extractThumbnail = async (videoPath) => {
  if (!videoPath) return null;

  const tempDir = path.dirname(videoPath);
  const thumbnailName = `thumb-${Date.now()}.jpg`;
  const outputPath = path.join(tempDir, thumbnailName);

  const timeInMs = 5000;

  try {
    await extractFrame({
      input: videoPath,
      output: outputPath,
      time: timeInMs,
    });

    await fs.access(outputPath);
    return outputPath;
  } catch (error) {
    return null;
  }
};
