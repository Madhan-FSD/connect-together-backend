import VALIDATORS from "./index.js";
import OTP from "../models/auth/otp.js";
import getOtpEmailTemplate from "../templates/getOtpEmailTemplate.js";
import sendOtpEmail from "../utils/maller.js";

const { otpGenerator } = VALIDATORS;

async function sendOTP(email, firstName, otpType) {
  const oldOtp = await OTP.findOne({ email, otpType });

  // This is my Limit otp 3 times in 1 hour
  if (
    oldOtp &&
    oldOtp.retryCount >= 3 &&
    Date.now() - oldOtp.lastSentAt < 60 * 60 * 1000
  ) {
    return {
      status: false,
      message: "OTP limit reached. Try again in 1 hour",
    };
  }

  // otp cooldown in 2 min
  if (oldOtp && Date.now() - oldOtp.lastSentAt < 2 * 60 * 1000) {
    return {
      status: false,
      message: "Please wait 2 minutes before requesting OTP again",
    };
  }

  const { otp, otpExpiry } = otpGenerator(2);

  await OTP.findOneAndUpdate(
    { email, otpType },
    {
      otp,
      otpExpiry,
      otpType,
      lastSentAt: Date.now(),
      $inc: { retryCount: 1 },
    },
    { upsert: true },
  );

  const subject = `${otpType.toUpperCase()} OTP | Peer Plus`;
  const html = getOtpEmailTemplate(otp, firstName);

  await sendOtpEmail(email, subject, html);

  return { status: true, message: "OTP sent successfully" };
}

export default sendOTP;
