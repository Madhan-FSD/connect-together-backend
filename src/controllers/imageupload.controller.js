import { logActivity } from "../utils/activityLog.js";
import cloudinary from "../utils/cloudinary.js";
import { checkChildPermission } from "../utils/permissions.js";

export const uploadImage = async (req, res) => {
  const { childId, parentId, childName, postType, title } = req.body;
  const filePath = req.file?.path;

  if (!filePath)
    return res.status(400).json({ error: "Image file is missing." });

  try {
    const folder =
      postType === "CHANNEL"
        ? `child_channels/${childId}/images`
        : `child_profiles/${childId}/images`;

    const { isAllowed } = await checkChildPermission(childId, postType);
    if (!isAllowed)
      throw new Error("Parental Control: Upload permission denied.");

    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlinkSync(filePath);

    const newImagePost = await PostModel.create({
      childId,
      parentId,
      title,
      contentUrl: result.secure_url,
      postType,
      contentType: "IMAGE",
    });

    await logActivity(
      "POSTED",
      parentId,
      childId,
      childName,
      newImagePost._id,
      `Posted an image to ${postType}.`
    );

    res
      .status(200)
      .json({ message: "Image posted successfully.", post: newImagePost });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res
      .status(500)
      .json({ error: "Failed to upload image.", details: error.message });
  }
};
