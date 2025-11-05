const OTP = require("../../models/auth/otp");
const USER = require("../../models/auth/user");
const getWelcomeEmailTemplate = require("../../templates/welcomeOnBoard");
const sendOtpEmail = require("../../utils/maller");
const jwt = require("jsonwebtoken");

exports.getOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpData = await OTP.findOne({ email });

    if (!otpData) return res.status(401).json({ message: "User not found" });

    if (otpData.otp !== Number(otp))
      return res.status(401).json({ message: "Invalid OTP" });

    if (otpData.otpExpiry < Date.now())
      return res.status(401).json({ message: "OTP expired" });

    const user = await USER.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User record missing" });
    }

    const firstName = user.firstName;

    await USER.findOneAndUpdate({ email }, { isVerifed: true });

    await OTP.deleteOne({ email });

    const subject = "Welcome On Board Peer Plus";
    const html = getWelcomeEmailTemplate(firstName, email);
    await sendOtpEmail(email, subject, html);

    return res
      .status(200)
      .json({ message: "OTP verified and signup completed" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpData = await OTP.findOne({ email });

    if (!otpData) {
      return res.status(400).json({ message: "OTP not found, please retry" });
    }

    if (otpData.otp !== Number(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpData.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await USER.findOne({ email }).select("-__v");

    await OTP.deleteOne({ email });

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
