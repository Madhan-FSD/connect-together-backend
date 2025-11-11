// utils/media.service.js
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * upload local path to Cloudinary
 * returns Cloudinary upload response
 */
export const uploadToCloudinary = async (localFilePath, options = {}) => {
  if (!localFilePath)
    throw new Error("uploadToCloudinary: localFilePath required");
  const folder = options.folder || "app";
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: options.resource_type || "auto",
    });
    // optionally delete local file after upload
    if (options.deleteLocal !== false) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (e) {
        /* ignore */
      }
    }
    return result;
  } catch (err) {
    // don't try to delete the file here on upload errors; caller decides
    throw err;
  }
};

/**
 * Delete a public_id from Cloudinary
 */
export const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId) throw new Error("deleteFromCloudinary: publicId required");
  const resource_type = options.resource_type || "image"; // or "video"
  return cloudinary.uploader.destroy(publicId, { resource_type });
};

/**
 * safeUpload: handle upload and attempt cleanup on errors
 */
export const safeUpload = async (localFilePath, options = {}) => {
  try {
    const r = await uploadToCloudinary(localFilePath, options);
    return r;
  } catch (err) {
    try {
      if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    } catch (e) {
      /*ignore*/
    }
    throw err;
  }
};
