const mongoose = require("mongoose");

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
  },
  { timestamps: true },
);

module.exports = RoleSchema;
