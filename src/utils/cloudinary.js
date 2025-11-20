import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const safelyUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {}
};

export const uploadOnCloudinary = async (
  localFilePath,
  folderPath,
  privacy = "public"
) => {
  if (!localFilePath) return null;

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
  const CHUNK_UPLOAD_THRESHOLD_BYTES = 10 * 1024 * 1024;
  const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(
    path.extname(localFilePath)
  );

  try {
    const stats = await fs.stat(localFilePath);
    const fileSize = stats.size;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      await safelyUnlink(localFilePath);
      return null;
    }

    let uploadMethod = cloudinary.uploader.upload;
    let options = {
      resource_type: "auto",
      folder: folderPath,
      type: privacy,
    };

    if (fileSize > CHUNK_UPLOAD_THRESHOLD_BYTES || isVideo) {
      uploadMethod = cloudinary.uploader.upload_large;
      options.chunk_size = 20 * 1024 * 1024;
    }

    if (isVideo) {
      options.eager = [
        { format: "m3u8", streaming_profile: "hd" },
        { format: "mpd", streaming_profile: "hd" },
      ];
      options.resource_type = "video";
    }

    const response = await new Promise((resolve, reject) => {
      uploadMethod(localFilePath, options, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      });
    });

    const uploadedFileSrc = response.secure_url || response.url;

    if (!uploadedFileSrc) {
      console.error(
        "File uploaded successfully, but could not find URL in the response."
      );
    }

    await safelyUnlink(localFilePath);

    return response;
  } catch (error) {
    await safelyUnlink(localFilePath);
    return null;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
    return result;
  } catch (error) {
    return null;
  }
};

export const generateSignedStreamingUrl = (publicId) => {
  const expiration = Math.floor(Date.now() / 1000) + 600;

  const signedUrl = cloudinary.url(publicId, {
    resource_type: "video",
    secure: true,
    type: "upload",
    sign_url: true,
    expires_at: expiration,
    streaming_profile: "hd",
    format: "m3u8",
  });

  return signedUrl;
};

export default cloudinary;
