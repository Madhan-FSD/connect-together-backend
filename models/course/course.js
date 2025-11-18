const mongoose = require("mongoose");
const auditSchema = require("../common/audit.Schema");
const courseContentSchema = require("../common/courseLeasson.Schema");

const courseSchema = new mongoose.Schema({
  courseId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  subtitle: String,
  description: String,

  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },

  category: String,
  subCategory: String,
  courseType: { type: String, enum: ["online", "offline", "hybrid"] },

  language: [String],

  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },

  basePrice: { type: Number, required: true },

  thumbnail: Buffer,
  coverImage: Buffer,

  tags: [String],

  isPaid: { type: Boolean, default: true },
  status: { type: String, enum: ["draft", "published"], default: "draft" },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  createdAt: { type: Date, default: Date.now },
  audit: auditSchema,
  courseContent: [courseContentSchema],
});

module.exports = mongoose.model("Course", courseSchema);
