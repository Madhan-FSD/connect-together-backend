import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ActivityLog from "../models/activitylog.model.js";

const findChildInfo = async (childId, parentId) => {
  if (!mongoose.Types.ObjectId.isValid(childId)) {
    throw new ApiError(400, "Invalid Child ID format.");
  }
  const childObjectId = new mongoose.Types.ObjectId(childId);

  const parent = await User.findOne(
    {
      _id: parentId,
      "children._id": childObjectId,
    },

    { "children.$": 1 }
  ).lean();

  if (!parent || !parent.children?.length) {
    throw new ApiError(
      404,
      "Child not found under this account or access denied."
    );
  }

  return parent.children[0];
};

/**
 * GET /api/reports/daily/:childId
 * Retrieves a summary of a child's game activity for a specific day.
 */
export const getDailyReport = asyncHandler(async (req, res) => {
  const { childId } = req.params;
  const { date } = req.query; // Optional: date in YYYY-MM-DD format

  const child = await findChildInfo(childId, req.userId);

  const targetDate = date ? new Date(date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dailyActivities = await ActivityLog.find({
    childId: child._id,
    timestamp: { $gte: targetDate, $lt: nextDay },
    activityType: { $in: ["GAME_COMPLETED", "GAME_STARTED", "COIN_EARNED"] },
  }).sort({ timestamp: -1 });

  const reportSummary = {
    date: targetDate.toISOString().split("T")[0],
    gamesPlayed: dailyActivities.filter((a) =>
      a.activityType.includes("GAME_COMPLETED")
    ).length,
    totalCoinsEarned: dailyActivities
      .filter((a) => a.activityType === "COIN_EARNED")
      .reduce((sum, a) => sum + (a.metadata?.amount || 0), 0),
    recentActivities: dailyActivities.slice(0, 10).map((a) => ({
      type: a.activityType,
      detail: a.description,
      time: a.timestamp,
    })),
  };

  res.status(200).json(reportSummary);
});

/**
 * GET /api/reports/leaderboard
 * Generates a global leaderboard based on children's game scores.
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await User.aggregate([
    { $match: { role: "PARENT" } },

    { $unwind: "$children" },

    {
      $project: {
        _id: "$children._id",
        name: "$children.name",

        score: {
          $ifNull: ["$children.totalGameScore", 0],
        },
        parentName: { $concat: ["$firstName", " ", "$lastName"] },
      },
    },

    { $sort: { score: -1 } },

    { $limit: 100 },
  ]);

  res.status(200).json({ leaderboard });
});

export const getChildWallet = asyncHandler(async (req, res) => {
  const { childId } = req.params;

  const child = await findChildInfo(childId, req.userId);

  const walletTransactions = await ActivityLog.find({
    childId: child._id,

    activityType: { $in: ["COIN_EARNED", "COIN_SPENT"] },
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  const currentBalance = child.walletBalance || 0;

  const formattedTransactions = walletTransactions.map((t) => ({
    // Determine if it's a credit or debit based on activity type
    type: t.activityType === "COIN_EARNED" ? "Credit" : "Debit",
    amount: t.metadata?.amount || 0,
    description: t.description || t.activityType,
    time: t.timestamp,
  }));

  res.status(200).json({
    childId: child._id,
    currentBalance,
    recentTransactions: formattedTransactions,
  });
});
