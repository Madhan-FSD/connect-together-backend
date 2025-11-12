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
    description: String,
    location: {
      city: String,
      pinCode: String,
      state: String,
      country: String,
      address: String,
    },
    departments: [String],
    courseType: { type: String, enum: ["online", "offline"], required: true },
    tags: [String],
    contactEmail: { type: String },
    contactPhone: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    isActive: { type: Boolean, default: true },
    seats: Number,
    fee: Number,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Institution", InstitutionSchema);
