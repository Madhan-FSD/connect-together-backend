const mongoose = require("mongoose");
const auditSchema = require("../common/audit.Schema");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    address: { type: String, required: true },
    pinCode: { type: Number, required: true },
    countryName: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: Number },
    alternativeNumber: { type: Number },
    audit: auditSchema,
  },

  { timestamps: true },
);
const Address = mongoose.model("Address", addressSchema);
module.exports = { Address, addressSchema };
