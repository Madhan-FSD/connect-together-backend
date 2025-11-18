const mongoose = require("mongoose");
const auditSchema = require("./audit.Schema");

const RoleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        "user",
        "parent",
        "child",
        "entityAdmin",
        "BranchAdmin",
        "OpratorAdmin",
        "StaffAdmin",
      ],
      default: "user",
    },
    audit: auditSchema,
  },
  { timestamps: true },
);

module.exports = RoleSchema;
