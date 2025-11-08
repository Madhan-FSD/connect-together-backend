const UserPhoto = require("../../models/photos/photoUsers");
const USER = require("../../models/auth/user");
const mongoose = require("mongoose");

const makeDoc = (file) => ({
  data: file.buffer,
  contentType: file.mimetype,
  fileSizeKB: Math.round(file.size / 1024),
});

exports.updatePhoto = async (req, res) => {
  try {
    const { userId, photoType, childId } = req.body;
    const file = req.file;

    if (!userId || !photoType)
      return res
        .status(400)
        .json({ message: "userId and photoType are required" });

    if (!file)
      return res.status(400).json({ message: "Photo file is required" });

    if (file.size > 100 * 1024)
      return res
        .status(400)
        .json({ message: "File size must not exceed 100 KB" });

    const photoDoc = makeDoc(file);

    if (photoType === "user") {
      const existingPhoto = await UserPhoto.findOne({ userId, photoType });

      if (existingPhoto) {
        existingPhoto.data = photoDoc.data;
        existingPhoto.contentType = photoDoc.contentType;
        existingPhoto.fileSizeKB = photoDoc.fileSizeKB;
        await existingPhoto.save();
      } else {
        await UserPhoto.create({ userId, photoType, ...photoDoc });
      }

      await USER.findByIdAndUpdate(userId, { photo: "uploaded" });
    } else if (photoType === "child") {
      if (!childId)
        return res
          .status(400)
          .json({ message: "childId is required for child photo" });

      const childObjectId = new mongoose.Types.ObjectId(childId);

      const existingPhoto = await UserPhoto.findOne({
        userId,
        childId: childObjectId,
        photoType: "child",
      });

      if (existingPhoto) {
        existingPhoto.data = photoDoc.data;
        existingPhoto.contentType = photoDoc.contentType;
        existingPhoto.fileSizeKB = photoDoc.fileSizeKB;
        await existingPhoto.save();
      } else {
        await UserPhoto.create({
          userId,
          childId: childObjectId,
          photoType: "child",
          ...photoDoc,
        });
      }

      await USER.updateOne(
        { "children._id": childObjectId },
        { $set: { "children.$.photo": "uploaded" } },
      );
    }

    return res.status(200).json({ message: "Photo uploaded successfully!" });
  } catch (error) {
    console.error("Update Photo Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
