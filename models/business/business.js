const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    businessId: { type: String, unique: true },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    businessName: { type: String, required: true },
    businessCode: { type: String, required: true },

    addressBusiness: { type: String },
    buisnessAbout: { type: String },

    busineessLogo: { type: String },
    busineessBanner: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Business", businessSchema);
