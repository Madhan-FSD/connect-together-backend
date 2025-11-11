import mongoose from "mongoose";

const GameSessionSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  gameType: {
    type: String,
    required: true,
    enum: [
      "TRIVIA",
      "STORY_ADVENTURE",
      "ANAGRAM",
      "WORD_ASSOCIATION",
      "RHYME_TIME",
      "VOCABULARY",
      "MATH",
      "PATTERN",
      "LOGIC",
      "RIDDLE",
    ],
  },
  score: {
    type: Number,
    default: 0,
  },
  maxScore: {
    type: Number,
    default: 0,
  },
  coinsEarned: {
    type: Number,
    default: 0,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  playedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const GameSession = mongoose.model("GameSession", GameSessionSchema);
export default GameSession;
