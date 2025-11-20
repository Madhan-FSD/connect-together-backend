import mongoose from "mongoose";

const FirebaseTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, index: true },
    device: { type: String, enum: ["ANDROID", "IOS", "WEB"], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false }
);

export { FirebaseTokenSchema };
