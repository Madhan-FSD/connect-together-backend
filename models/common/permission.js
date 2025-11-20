const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
});

module.exports = mongoose.model("Permission", PermissionSchema);
