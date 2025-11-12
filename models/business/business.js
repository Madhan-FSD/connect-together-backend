const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    businessName: { type: String, required: true },
    businessCode: { type: String, required: true },
    addressBusiness: { type: String, required: true },
    buisnessAbout: { type: String, required: true },
    busineessLogo: { type: Buffer },
    busineessBanner: { type: Buffer },
    contentType: { type: String },
    fileSizeKB: { type: Number },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Business", businessSchema);
