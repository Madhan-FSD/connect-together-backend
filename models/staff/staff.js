const mongoose = require("mongoose");
const auditSchema = require("../common/audit.Schema");
const RoleSchema = require("../common/role.Schema");

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    password: { type: String, required: true },

    role: RoleSchema,

    branchId: {
      type: String,
      ref: "Branch",
      required: true,
      index: true,
    },

    audit: auditSchema,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Staff", staffSchema);
