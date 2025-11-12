const USER = require("../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const VALIDATORS = require("../../helpers");
const sendOTP = require("../../helpers/sendOtpHandler");
const OTP = require("../../models/auth/otp");
const jwt = require("jsonwebtoken");
const USER_PHOTO = require("../../models/photos/photoUsers");
const ADDRESS = require("../../models/address/address");

exports.signUp = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    const existUser = await USER.findOne({ email });
    if (existUser)
      return res.status(400).json({ message: "Email already exists" });

    const existPhone = await USER.findOne({ phone });
    if (existPhone)
      return res.status(400).json({ message: "Phone number already exists" });

    const plainPassword = VALIDATORS.generatedPassword();
    const hashPassword = await bcrypt.hash(plainPassword, 10);

    await USER.create({
      userId: uuidv4(),
      firstName,
      lastName,
      email,
      phone,
      password: hashPassword,
      isVerifed: false,
    });

    await sendOTP(email, firstName, "signup");

    return res.status(200).json({
      success: true,
      message: "OTP sent to email for verification",
    });
  } catch (error) {
    return VALIDATORS.errorHandlerResponse(res, 500, error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, userId, pin, loginType } = req.body;

    if (loginType === "password") {
      if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });

      const user = await USER.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "User not registered" });
      if (!user.isVerifed)
        return res.status(400).json({ message: "Verify your account first" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid password" });

      const token = jwt.sign(
        { id: user._id, email: user.email, userType: user.userType },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.status(200).json({
        success: true,
        message: "Login successful with password",
        token,
        userType: user.userType,
        user,
      });
    }

    if (loginType === "otp") {
      if (!email)
        return res
          .status(400)
          .json({ message: "Email required for OTP login" });

      const user = await USER.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "User not registered" });
      if (!user.isVerifed)
        return res.status(400).json({ message: "Verify your account first" });

      await sendOTP(email, user.firstName, "login");

      return res.status(200).json({
        success: true,
        message: "OTP sent for login",
      });
    }

    if (loginType === "child") {
      if (!userId || !pin)
        return res
          .status(400)
          .json({ message: "User ID and PIN are required" });

      const parent = await USER.findOne({
        "children.userId": userId,
      });

      if (!parent)
        return res.status(404).json({ message: "Child account not found" });

      const child = parent.children.find((c) => c.userId === userId);

      if (!child || child.pin !== pin)
        return res.status(400).json({ message: "Invalid userId or PIN" });

      const token = jwt.sign(
        {
          parentId: parent._id,
          childId: child._id,
          userId: child.userId,
          relation: child.relation,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.status(200).json({
        success: true,
        message: "Child login successful",
        token,
        child: {
          firstName: child.firstName,
          lastName: child.lastName,
          userId: child.userId,
          relation: child.relation,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid loginType. Use 'password', 'otp', or 'child'",
    });
  } catch (error) {
    console.error("Login Error:", error);
    return VALIDATORS.errorHandlerResponse(res, 500, error.message);
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await USER.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not registered" });

    await sendOTP(email, user.firstName, "forget");

    return res.status(200).json({ message: "OTP sent for password reset" });
  } catch (error) {
    return VALIDATORS.errorHandlerResponse(res, 500, error.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpData = await OTP.findOne({ email, otpType: "forget" });

    if (!otpData) return res.status(400).json({ message: "OTP not found" });
    if (otpData.otp !== Number(otp))
      return res.status(400).json({ message: "Invalid OTP" });
    if (otpData.otpExpiry < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const hash = await bcrypt.hash(newPassword, 10);
    await USER.updateOne({ email }, { password: hash });
    await OTP.deleteOne({ email, otpType: "forget" });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return VALIDATORS.errorHandlerResponse(res, 500, error.message);
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await USER.findById(req.user.id).lean();

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const address = await ADDRESS.findOne({ userId: user._id }).lean();

    const userPhoto = await USER_PHOTO.findOne({
      userId: user._id,
      photoType: "user",
    });

    let userPhotoBase64 = null;
    if (userPhoto?.data) {
      userPhotoBase64 = `data:${
        userPhoto.contentType
      };base64,${userPhoto.data.toString("base64")}`;
    }

    if (user.children?.length > 0) {
      const childIds = user.children.map((child) => child._id);

      const childPhotos = await USER_PHOTO.find({
        childId: { $in: childIds },
        photoType: "child",
      });

      user.children = user.children.map((child) => {
        const photoDoc = childPhotos.find(
          (photo) => photo.childId?.toString() === child._id.toString(),
        );

        const photoBase64 =
          photoDoc && photoDoc.data
            ? `data:${photoDoc.contentType};base64,${photoDoc.data.toString(
                "base64",
              )}`
            : null;

        return {
          _id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
          gender: child.gender,
          relation: child.relation,
          dateOfBirth: child.dateOfBirth,
          pin: child.pin,
          photo: photoBase64,
        };
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profile: {
        ...user,
        photo: userPhotoBase64,
        address: address || null,
      },
    });
  } catch (error) {
    console.error("Profile API Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, ...updateData } = req.body;

    if (updateData.email) delete updateData.email;

    const existingUser = await USER.findById(userId);
    if (!existingUser)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    if (updateData.phone && updateData.phone === existingUser.phone) {
      delete updateData.phone;
    } else if (updateData.phone) {
      const duplicate = await USER.findOne({
        phone: updateData.phone,
        _id: { $ne: userId },
      });
      if (duplicate)
        return res
          .status(400)
          .json({ success: false, message: "Phone number already exists" });
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(existingUser, updateData);
    await existingUser.save();

    let addressDoc;
    if (address) {
      const existAddress = await ADDRESS.findOne({ userId });

      if (existAddress) {
        addressDoc = await ADDRESS.findOneAndUpdate(
          { userId },
          { $set: address },
          { new: true },
        );
      } else {
        addressDoc = new ADDRESS({ ...address, userId });
        await addressDoc.save();
      }
    } else {
      addressDoc = await ADDRESS.findOne({ userId });
    }

    const mergedProfile = {
      ...existingUser.toObject(),
      address: addressDoc ? addressDoc.toObject() : null,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: mergedProfile,
    });
  } catch (error) {
    console.log("Edit Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
