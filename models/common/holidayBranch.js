const mongoose = require("mongoose");
const auditSchema = require("./audit.Schema");

const HolidayBranchSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      ref: "Branch",
      required: true,
    },
    unquicId: {
      type: String,
      required: true,
    },
    dateHoliday: {
      type: Date,
      required: true,
    },
    hoildayTypes: {
      type: String,
      enum: ["full_holiday", "half_holiday"],
      required: true,
    },
    openingTime: {
      type: String,
      default: null,
    },
    closingTime: {
      type: String,
      default: null,
    },
    audit: auditSchema,
  },
  { timestamps: true },
);

module.exports = HolidayBranchSchema;
