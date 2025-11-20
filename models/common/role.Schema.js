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

// const mongoose = require("mongoose");

// const RoleSchema = new mongoose.Schema({
//   roleName: { type: String, required: true, unique: true },
//   roleCode: { type: String, required: true, unique: true },
// });

// module.exports = mongoose.model("role", RoleSchema);
