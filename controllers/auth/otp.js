const OTP = require("../../models/auth/otp");
const USER = require("../../models/auth/user");
const getWelcomeEmailTemplate = require("../../templates/welcomeOnBoard");
const sendOtpEmail = require("../../utils/maller");
const jwt = require("jsonwebtoken");
const sendOTP = require("../../helpers/sendOtpHandler");
const {
  responseHandler,
  errorResponse,
  STATUS,
} = require("../../utils/responseHandler");

export const verifySignUpOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpData = await OTP.findOne({ email, otpType: "signup" });
    if (!otpData)
      return responseHandler(res, STATUS.NOT_FOUND, "OTP not found");

    if (otpData.otp !== Number(otp))
      return responseHandler(res, STATUS.BAD, "Invalid OTP");

    if (otpData.otpExpiry < Date.now())
      return responseHandler(res, STATUS.BAD, "OTP has expired");

    const user = await USER.findOne({ email });
    if (!user) return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    await USER.updateOne(
      { email },
      {
        $set: {
          "audit.isVerified": true,
          "audit.updatedBy": user._id,
        },
      },
    );

    await OTP.deleteOne({ email, otpType: "signup" });

    await sendOtpEmail(
      email,
      "Welcome to Peer Plus",
      getWelcomeEmailTemplate(user.firstName, email),
    );

    return responseHandler(res, STATUS.OK, "OTP verified successfully");
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    return errorResponse(res, error);
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpData = await OTP.findOne({ email, otpType: "login" });

    if (!otpData)
      return responseHandler(res, STATUS.NOT_FOUND, "OTP not found");
    if (otpData.otp !== Number(otp))
      return responseHandler(res, STATUS.BAD, "Invalid OTP");
    if (otpData.otpExpiry < Date.now())
      return responseHandler(res, STATUS.BAD, "OTP has expired");

    const user = await USER.findOne({ email }).select("-password");

    await OTP.deleteOne({ email, otpType: "login" });

    const token = jwt.sign(
      { id: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return responseHandler(res, STATUS.OK, "OTP verified successfully", {
      token,
      user,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email, otpType } = req.body;
    const user = await USER.findOne({ email });

    if (!user) return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    const response = await sendOTP(email, user.firstName, otpType);
    return responseHandler(res, STATUS.OK, response);
  } catch (error) {
    return errorResponse(res, error);
  }
};

export default {
  verifySignUpOtp,
  verifyLoginOtp,
  resendOtp,
};
