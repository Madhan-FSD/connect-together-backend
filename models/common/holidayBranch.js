const mongoose = require("mongoose");

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
  },
  { timestamps: true },
);

module.exports = HolidayBranchSchema;
