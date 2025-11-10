const OTP = require("../../models/auth/otp");
const USER = require("../../models/auth/user");
const getWelcomeEmailTemplate = require("../../templates/welcomeOnBoard");
const sendOtpEmail = require("../../utils/maller");
const jwt = require("jsonwebtoken");
const sendOTP = require("../../helpers/sendOtpHandler");

exports.verifySignUpOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpData = await OTP.findOne({ email, otpType: "signup" });

    if (!otpData) return res.status(400).json({ message: "OTP not found" });
    if (otpData.otp !== Number(otp))
      return res.status(400).json({ message: "Invalid OTP" });
    if (otpData.otpExpiry < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    await USER.updateOne({ email }, { isVerifed: true });
    await OTP.deleteOne({ email, otpType: "signup" });

    const user = await USER.findOne({ email });
    await sendOtpEmail(
      email,
      "Welcome to Peer Plus",
      getWelcomeEmailTemplate(user.firstName, email),
    );

    return res.status(200).json({ message: "Signup verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpData = await OTP.findOne({ email, otpType: "login" });

    if (!otpData) return res.status(400).json({ message: "OTP not found" });
    if (otpData.otp !== Number(otp))
      return res.status(400).json({ message: "Invalid OTP" });
    if (otpData.otpExpiry < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const user = await USER.findOne({ email }).select("-password");

    await OTP.deleteOne({ email, otpType: "login" });

    const token = jwt.sign(
      { id: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({ message: "Login successful", token, user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, otpType } = req.body;
    const user = await USER.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const response = await sendOTP(email, user.firstName, otpType);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
