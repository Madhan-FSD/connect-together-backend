const mongoose = require("mongoose");
const auditSchema = require("./audit.Schema");

const courseContentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  sectionTitle: { type: String, required: true },
  audit: auditSchema,
  lessons: [
    {
      title: { type: String, required: true },
      videoUrl: String,
      pdfUrl: String,
      duration: Number,
      isPreview: Boolean,
    },
  ],
});

module.exports = courseContentSchema;
