const USER = require("../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const VALIDATORS = require("../../helpers");
const sendOTP = require("../../helpers/sendOtpHandler");
const OTP = require("../../models/auth/otp");
const Counter = require("../../models/auth/counter");

const getNextChildId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "childUserId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );

  const formatted = String(counter.value).padStart(3, "0");
  return `peer${formatted}`;
};

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
    const { email } = req.body;
    const existUser = await USER.findOne({ email });

    if (!existUser)
      return res.status(400).json({ message: "User not registered" });
    if (!existUser.isVerifed)
      return res.status(400).json({ message: "Verify your account first" });

    await sendOTP(email, existUser.firstName, "login");

    return res.status(200).json({
      success: true,
      message: "OTP sent for login",
    });
  } catch (error) {
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

exports.onBoarding = async (req, res) => {
  try {
    const { email, hasChild, childData } = req.body;

    const user = await USER.findOne({ email }).select("-password");
    if (!user) return res.status(400).json({ message: "User not found" });

    if (
      user.hasChild ||
      user.userType === "parent" ||
      user.children.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Onboarding already completed",
      });
    }

    if (!hasChild) {
      user.hasChild = false;
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Onboarding skipped successfully",
        user,
      });
    }

    if (hasChild && childData) {
      const childArray = Array.isArray(childData) ? childData : [childData];
      user.userType = "parent";
      user.hasChild = true;

      const newChildren = [];

      for (let i = 0; i < childArray.length; i++) {
        const nextChildId = await getNextChildId();
        const newChild = {
          ...childArray[i],
          userId: nextChildId,
          parentId: user._id,
        };
        newChildren.push(newChild);
      }

      user.children.push(...newChildren);
      await user.save();

      return res.status(200).json({
        success: true,
        message: `${newChildren.length} child${
          newChildren.length > 1 ? "ren" : ""
        } added successfully`,
        user,
      });
    }

    return res.status(400).json({ message: "Invalid request body" });
  } catch (error) {
    console.error("Onboarding Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
