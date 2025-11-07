const mongoose = require("mongoose");

const userPhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: "Users.children" },
    photoType: {
      type: String,
      enum: ["user", "child"],
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    fileSizeKB: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserPhoto", userPhotoSchema);
