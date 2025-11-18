const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: false,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: false,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    hasChild: { type: Boolean, default: false },
  },
  { _id: false },
);

module.exports = auditSchema;
