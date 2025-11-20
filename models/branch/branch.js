const mongoose = require("mongoose");
const { addressSchema } = require("../address/address");
const auditSchema = require("../common/audit.Schema");
const RoleSchema = require("../common/role.Schema");
const HolidayBranchSchema = require("../common/holidayBranch");

const branchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    branchId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    branchName: {
      type: String,
      required: true,
    },
    branchCode: {
      type: String,
      required: true,
    },
    contactInfo: addressSchema,
    branchLogo: {
      type: Buffer,
      required: false,
    },
    branchDays: {
      type: [String],
      required: true,
    },
    branchTime: {
      open: { type: String, required: true },
      close: { type: String, required: true },
    },
    audit: auditSchema,
    role: RoleSchema,
    entityId: {
      type: String,
      ref: "CompanyInformation",
      required: true,
      index: true,
    },
    holidayBranch: HolidayBranchSchema,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Branch", branchSchema);
