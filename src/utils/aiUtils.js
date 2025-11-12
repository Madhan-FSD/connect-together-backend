import dotenv from "dotenv";
dotenv.config();
import { User } from "../models/user.model.js";
import ActivityLog from "../models/activitylog.model.js";
import { Post } from "../models/post.model.js";
import mongoose from "mongoose";
import cron from "node-cron";
import { generateAIInsight, generateFeaturedContent } from "./aiService.js";

const INSIGHT_PATTERN = getCronPattern(
  process.env.INSIGHT_GENERATION_FREQUENCY
);
const FEATURED_CONTENT_PATTERN = getCronPattern(
  process.env.FEATURED_CONTENT_CRON || "0 0 * * *"
);
const FEATURED_POSTS_LIMIT = parseInt(
  process.env.FEATURED_POSTS_LIMIT || "10",
  10
);

function getCronPattern(freq) {
  if (!freq) return "0 0 * * 0";
  if (freq === "1m") return "* * * * *";
  if (freq === "1d") return "0 0 * * *";
  if (freq === "7d") return "0 0 * * 0";
  if (freq === "30d") return "0 0 1 * *";
  return "0 0 * * 0";
}

/**
 * Utility to validate and convert IDs to Mongoose ObjectIds.
 */
function _validateAndConvertIds(ids) {
  const objectIds = [];
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    objectIds.push(new mongoose.Types.ObjectId(id));
  }
  return objectIds;
}

/**
 * Fetches child activity data, generates ONE AI insight, and stores it in the parent document.
 * This is typically called immediately upon a child completing content (on-demand).
 * @param {string} parentId - The ID of the parent document.
 * @param {string} childId - The ID of the child subdocument.
 * @param {string} childName - The name of the child.
 */
export async function generateAndStoreSingleInsight(
  parentId,
  childId,
  childName
) {
  const ids = _validateAndConvertIds([parentId, childId]);
  if (!ids) {
    console.error("Insight generation failed: Invalid Parent or Child ID.");
    return;
  }

  const [parentObjectId, childObjectId] = ids;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = await ActivityLog.find({
      childId: childObjectId,
      timestamp: { $gte: sevenDaysAgo },
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    if (recentLogs.length === 0) {
      console.log(
        `No recent activity found for ${childName}. Skipping single insight generation.`
      );
      return;
    }

    const summary = await generateAIInsight(childName, recentLogs);

    const newInsight = {
      summary: summary,
      generatedAt: new Date(),
    };

    const updateResult = await User.updateOne(
      { _id: parentObjectId, "children._id": childObjectId },
      {
        $push: {
          "children.$.insights": {
            $each: [newInsight],
            $sort: { generatedAt: -1 },
            $slice: 10,
          },
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(
        `Successfully generated and stored single insight for ${childName}.`
      );
    } else {
      console.error(
        `Failed to push single insight for ${childName}. Subdocument not found or update failed.`
      );
    }
  } catch (error) {
    console.error("Error in single AI insight generation:", error);
  }
}

export async function generateAllChildInsights() {
  console.log("Starting all child insight generation...");

  const parents = await User.find({ role: "PARENT" });

  for (const parent of parents) {
    const parentId = parent._id;

    for (const child of parent.children) {
      const childId = child._id;
      const childName = child.name || "A Child User";

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivities = await ActivityLog.find({
        parentId: parentId,
        childId: childId,
        timestamp: { $gte: sevenDaysAgo },
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      if (recentActivities.length === 0) continue;

      try {
        const summary = await generateAIInsight(childName, recentActivities);

        await User.updateOne(
          { _id: parentId, "children._id": childId },
          {
            $push: {
              "children.$.insights": {
                $each: [{ summary, generatedAt: new Date() }],
                $sort: { generatedAt: -1 },
                $slice: 10,
              },
            },
          }
        );
        console.log(`Generated and saved insight for ${childName}.`);
      } catch (err) {
        console.error("AI error for child", childName, err.message);
      }
    }
  }
  console.log("All child insight generation complete.");
}

export async function generateAllFeaturedContent() {
  console.log("Starting AI Featured Content generation job...");
  console.log(
    `Analyzing the top ${FEATURED_POSTS_LIMIT} most recent posts per user.`
  );

  const users = await User.find({}).select("_id").lean();

  for (const user of users) {
    const userId = user._id;

    const userPosts = await Post.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(FEATURED_POSTS_LIMIT)
      .lean();

    if (userPosts.length === 0) {
      console.log(
        `User ${userId} has no posts. Skipping featured content generation.`
      );
      continue;
    }

    const { introHeadline, items } = await generateFeaturedContent(
      userPosts,
      4
    );

    if (!items || items.length === 0) {
      console.warn(
        `AI failed to generate items for user ${userId}. Skipping save.`
      );
      continue;
    }

    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          featuredContent: {
            // Map the returned fields to your database schema fields
            // Assuming your database fields are introHeadline and items:
            introHeadline: introHeadline,
            items: items,
            generatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    console.log(`Generated and saved featured content for user ${userId}.`);
  }
  console.log("AI Featured Content generation job finished successfully.");
}

export function startAiTasks() {
  console.log(`Scheduling Child Insights with pattern: ${INSIGHT_PATTERN}`);
  cron.schedule(INSIGHT_PATTERN, () => {
    generateAllChildInsights().catch((err) =>
      console.error("Child Insight CRON Error:", err)
    );
  });

  console.log(
    `Scheduling Featured Content with pattern: ${FEATURED_CONTENT_PATTERN}`
  );
  cron.schedule(FEATURED_CONTENT_PATTERN, () => {
    generateAllFeaturedContent().catch((err) =>
      console.error("Featured Content CRON Error:", err)
    );
  });
}

export const cleanJson = (text) => {
  let cleanedText = text.replace(/```(json|typescript|javascript|)\s*/gis, "");
  cleanedText = cleanedText.replace(/```\s*$/gis, "");

  const firstCharIndex = cleanedText.search(/[{[]/);
  const lastCharIndex = cleanedText.search(/[}\]]\s*$/);

  if (
    firstCharIndex !== -1 &&
    lastCharIndex !== -1 &&
    lastCharIndex > firstCharIndex
  ) {
    cleanedText = cleanedText.substring(firstCharIndex, lastCharIndex + 1);
  }

  return cleanedText.trim();
};
