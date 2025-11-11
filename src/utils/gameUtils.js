import ChildWallet from "../models/childwallet.model.js";
import DailyActivitySummary from "../models/dailyActivitySummary.model.js";

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const updateDailySummaryAndWallet = async (
  childId,
  sessionId,
  coinsEarned,
  score
) => {
  const today = getStartOfDay(new Date());

  await DailyActivitySummary.findOneAndUpdate(
    {
      childId: childId,
      date: today,
    },
    {
      $inc: {
        totalScore: score,
        totalCoinsEarned: coinsEarned,
        totalGamesPlayed: 1,
      },
      $push: { sessionIds: sessionId },
    },
    {
      upsert: true,
      new: true,
    }
  );

  await ChildWallet.findOneAndUpdate(
    { childId: childId },
    {
      $inc: { currentBalance: coinsEarned },
      lastUpdate: new Date(),
    },
    { upsert: true }
  );
};
