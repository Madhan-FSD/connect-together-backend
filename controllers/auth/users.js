const USER = require("../../models/auth/user");
const OTP = require("../../models/auth/otp");
const getOtpEmailTemplate = require("../../templates/getOtpEmailTemplate");
const sendOtpEmail = require("../../utils/maller");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const VALIDATORS = require("../../helpers");

exports.signUp = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    const existUser = await USER.findOne({ email });
    if (existUser) {
      return res.status(400).json({ message: "Email Already exists" });
    }

    const existPhone = await USER.findOne({ phone });
    if (existPhone) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    const plainPassword = VALIDATORS.generatedPassword();
    const hashPassword = await bcrypt.hash(plainPassword, 10);

    const { otp, otpExpired } = VALIDATORS.otpGenerator(2);

    const newUserId = uuidv4();

    await USER.create({
      userId: newUserId,
      firstName,
      lastName,
      email,
      phone,
      isVerifed: false,
      password: hashPassword,
    });

    await OTP.findOneAndUpdate(
      { email },
      {
        otp,
        otpExpired,
      },
      { upsert: true },
    );

    const subject = "Verify your email OTP";
    const html = getOtpEmailTemplate(otp, firstName);

    await sendOtpEmail(email, subject, html);

    return res
      .status(200)
      .json({ success: true, message: "Otp Send to your email address" });
  } catch (error) {
    return VALIDATORS.errorHandlerResponse(
      res,
      500,
      error.message || "Server Error",
    );
  }
};

exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    const existUser = await USER.findOne({ email });
    if (!existUser) {
      return res.status(400).json({ message: "User is not registered" });
    }

    if (!existUser) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    const { otp } = VALIDATORS.otpGenerator();

    await OTP.findOneAndUpdate({ email }, { otp, otpExpiry }, { upsert: true });
    const subject = "Login OTP | Peer Plus";
    const html = getOtpEmailTemplate(otp, existUser.firstName);

    await sendOtpEmail(email, subject, html);

    return res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (error) {
    return VALIDATORS.errorHandlerResponse(
      res,
      500,
      error.message || "Server Error",
    );
  }
};
