const mongoose = require("mongoose");
const auditSchema = require("./audit.Schema");

const HolidayBranchSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      ref: "Branch",
      required: true,
    },
    uniqueId: {
      type: String,
      required: true,
      unique: true,
    },
    dateHoliday: {
      type: Date,
      required: true,
    },
    hoildayTypes: {
      type: Boolean,
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
