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
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Failed to delete local file ${filePath}:`, error.message);
    }
  }
};

export const uploadOnCloudinary = async (localFilePath, folderPath) => {
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
      console.error(
        `[Cloudinary] File size (${fileSize} bytes) exceeds the maximum allowed limit of ${
          MAX_FILE_SIZE_BYTES / (1024 * 1024)
        }MB on this plan. Upload aborted.`
      );
      await safelyUnlink(localFilePath);
      return null;
    }

    let uploadMethod = cloudinary.uploader.upload;
    let options = {
      resource_type: "auto",
      folder: folderPath,
    };

    if (fileSize > CHUNK_UPLOAD_THRESHOLD_BYTES || isVideo) {
      uploadMethod = cloudinary.uploader.upload_large;

      options.chunk_size = 20 * 1024 * 1024;

      const reason = isVideo ? "is a video file" : "exceeds 10MB";

      console.log(
        `[Cloudinary] File ${reason}. Using chunked upload with ${
          options.chunk_size / (1024 * 1024)
        }MB chunks.`
      );
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

    if (uploadedFileSrc) {
      console.log("File uploaded on cloudinary. File src: " + uploadedFileSrc);
    } else {
      console.error(
        "File uploaded successfully, but could not find 'secure_url' or 'url' in the response."
      );
      console.log(
        "Full Cloudinary API Response Object (Expected JSON):",
        response
      );
    }

    await safelyUnlink(localFilePath);

    return response;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

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

    console.log("Deleted from cloudinary. public id - ", publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary deletion failed:", error);
    return null;
  }
};

export default cloudinary;
