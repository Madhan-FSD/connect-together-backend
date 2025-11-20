const USER = require("../../models/auth/user");
const bcrypt = require("bcrypt");
const USER_PHOTO = require("../../models/photos/photoUsers");
const { Address } = require("../../models/address/address");
const {
  responseHandler,
  errorResponse,
  STATUS,
} = require("../../utils/responseHandler");

exports.profile = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "child") {
      const parent = await USER.findById(req.user.parentId).lean();
      if (!parent)
        return responseHandler(res, STATUS.NOT_FOUND, "Parent user not found");

      const child = parent.children?.find(
        (c) => c._id.toString() === req.user.childId,
      );

      if (!child)
        return responseHandler(res, STATUS.NOT_FOUND, "Child user not found");

      const childPhoto = await USER_PHOTO.findOne({
        childId: child._id,
        photoType: "child",
      }).lean();

      const childPhotoBase64 = childPhoto?.data
        ? `data:${childPhoto.contentType};base64,${childPhoto.data.toString(
            "base64",
          )}`
        : null;

      return responseHandler(
        res,
        STATUS.OK,
        "Child profile fetched successfully",
        {
          profile: {
            firstName: child.firstName,
            lastName: child.lastName,
            userId: child.userId,
            gender: child.gender,
            relation: child.relation,
            dateOfBirth: child.dateOfBirth,
            pin: child.pin,
            photo: childPhotoBase64,
            role: "child",
          },
        },
      );
    }

    const user = await USER.findById(req.user.id).lean();
    if (!user) return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    if (user.password) delete user.password;

    const address = await Address.findOne({ userId: user._id }).lean();

    const userPhoto = await USER_PHOTO.findOne({
      userId: user._id,
      photoType: "user",
    }).lean();

    const userPhotoBase64 = userPhoto?.data
      ? `data:${userPhoto.contentType};base64,${userPhoto.data.toString(
          "base64",
        )}`
      : null;

    let childrenResponse = [];
    if (Array.isArray(user.children) && user.children.length > 0) {
      const childIds = user.children.map((c) => c._id);

      const childPhotos = await USER_PHOTO.find({
        childId: childIds,
        photoType: "child",
      }).lean();

      childrenResponse = user.children.map((child) => {
        const photoDoc = childPhotos.find(
          (p) => p.childId.toString() === child._id.toString(),
        );

        const childImage = photoDoc?.data
          ? `data:${photoDoc.contentType};base64,${photoDoc.data.toString(
              "base64",
            )}`
          : null;

        return {
          _id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
          gender: child.gender,
          dateOfBirth: child.dateOfBirth,
          relation: child.relation,
          pin: child.pin,
          userId: child.userId,
          photo: childImage,
        };
      });
    }
    return responseHandler(res, STATUS.OK, "Profile fetched successfully", {
      profile: {
        ...user,
        role: user.role?.role || role,
        photo: userPhotoBase64,
        address: address || null,
        children: childrenResponse,
      },
    });
  } catch (err) {
    console.log("Profile API Error:", err.message);
    return errorResponse(res, err);
  }
};

exports.editProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, ...updateData } = req.body;

    if (updateData.email) delete updateData.email;

    const existingUser = await USER.findById(userId);
    if (!existingUser)
      return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    if (updateData.phone && updateData.phone !== existingUser.phone) {
      const duplicate = await USER.findOne({
        phone: updateData.phone,
        _id: { $ne: userId },
      });
      if (duplicate)
        return responseHandler(res, STATUS.BAD, "Phone number already in use");
    } else {
      delete updateData.phone;
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(existingUser, updateData);
    await existingUser.save();

    let addressDoc;

    if (address) {
      address.email = existingUser.email;

      const existAddress = await Address.findOne({ userId });

      if (existAddress) {
        addressDoc = await Address.findOneAndUpdate(
          { userId },
          { $set: address },
          { new: true },
        );
      } else {
        addressDoc = new Address({ ...address, userId });
        await addressDoc.save();
      }
    } else {
      addressDoc = await Address.findOne({ userId });
    }

    const mergedProfile = {
      ...existingUser.toObject(),
      address: addressDoc ? addressDoc.toObject() : null,
    };

    return responseHandler(res, STATUS.OK, "Profile updated successfully", {
      user: mergedProfile,
    });
  } catch (error) {
    console.log("Edit Profile Error:", error);
    return errorResponse(res, error);
  }
};
