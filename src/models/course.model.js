import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    subject: String,
    gradeLevel: Number,
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ instructor: 1, deletedAt: 1 });
courseSchema.index({ subject: 1, gradeLevel: 1, deletedAt: 1 });
courseSchema.index({ deletedAt: 1 });
courseSchema.index({ title: "text", description: "text" });

const Course = mongoose.model("Course", courseSchema);
export default Course;
