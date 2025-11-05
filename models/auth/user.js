const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    countryCode: { type: String, default: "+91" },
    password: { type: String, required: true },
    userType: { type: String, enum: ["normal", "parent"], default: "normal" },
    isVerifed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Users", UserSchema);
