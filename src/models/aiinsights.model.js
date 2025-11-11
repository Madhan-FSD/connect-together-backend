import mongoose from "mongoose";

const AIInsightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  insightType: {
    type: String,
    required: true,
    enum: [
      "RECOMMENDATION",
      "ACTIVITY_SUMMARY",
      "LEARNING_PATH",
      "RESUME_GENERATION_HTML",
    ],
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  role: {
    type: String,
    enum: ["PARENT", "CHILD", "NORMAL_USER"],
    default: "NORMAL_USER",
  },
});

AIInsightSchema.index({ userId: 1, insightType: 1, generatedAt: -1 });

const AIInsight = mongoose.model("AIInsight", AIInsightSchema);
export default AIInsight;
