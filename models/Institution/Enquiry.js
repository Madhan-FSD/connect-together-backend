const mongoose = require("mongoose");

const EnquirySchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    fulName: String,
    userEmail: String,
    phone: String,
    message: String,
    status: {
      type: String,
      enum: ["pending", "contacted", "closed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Enquiry", EnquirySchema);
