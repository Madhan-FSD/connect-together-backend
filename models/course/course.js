const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    type: {
      type: String,
      enum: ["course", "certificate", "diploma", "tuition"],
      default: "course",
    },
    description: { type: String },
    tags: [String],
    seats: { type: Number },
    fee: { type: Number },
    startDate: Date,
    endDate: Date,
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Course", CourseSchema);
