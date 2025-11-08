import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: Number, required: true },
  otpExpiry: { type: Number, required: true },
  otpType: {
    type: String,
    enum: ["signup", "login", "forget"],
    required: true,
  },
  retryCount: { type: Number, default: 0 },
  lastSentAt: { type: Number, default: null },
});

export default mongoose.model("Otp", otpSchema);
