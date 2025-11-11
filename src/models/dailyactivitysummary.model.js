import mongoose from "mongoose";

const DailyActivitySummarySchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  totalCoinsEarned: {
    type: Number,
    default: 0,
  },
  totalGamesPlayed: {
    type: Number,
    default: 0,
  },
  sessionIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
    },
  ],
});

DailyActivitySummarySchema.index({ childId: 1, date: 1 }, { unique: true });

const DailyActivitySummary = mongoose.model(
  "DailyActivitySummary",
  DailyActivitySummarySchema
);
export default DailyActivitySummary;
