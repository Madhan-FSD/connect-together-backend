const mongoose = require("mongoose");

const courseContentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

  sectionTitle: String,

  lessons: [
    {
      title: String,
      videoUrl: String,
      pdfUrl: String,
      duration: Number,
      isPreview: Boolean,
    },
  ],
});

module.exports = courseContentSchema;
