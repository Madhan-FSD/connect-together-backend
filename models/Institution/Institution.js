const mongoose = require("mongoose");

const InstitutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "school",
        "college",
        "tuition",
        "course",
        "certificate",
        "diploma",
      ],
      required: true,
    },
    description: { type: String },
    location: {
      city: String,
      pinCode: String,
      state: String,
      country: String,
      address: String,
    },
    departments: [String],
    tags: [String],
    contactEmail: { type: String },
    contactPhone: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Institution", InstitutionSchema);
