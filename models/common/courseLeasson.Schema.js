const mongoose = require("mongoose");

const courseContentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

  sectionTitle: { type: String, required: true },

  lessons: [
    {
      title: { type: String, required: true },
      videoUrl: String,
      pdfUrl: String,
      duration: Number,
      isPreview: Boolean,
    },
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  createdByRole: { type: String },
});

module.exports = courseContentSchema;
