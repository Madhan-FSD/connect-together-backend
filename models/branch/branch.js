const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    branchName: {
      type: String,
      required: true,
    },

    branchCode: {
      type: String,
      required: true,
    },

    contactInfo: {
      type: String,
      required: true,
    },

    branchLogo: {
      type: Buffer,
      required: false,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyInformation",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Branch", branchSchema);
