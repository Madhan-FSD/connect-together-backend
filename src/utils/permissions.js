import { User } from "../models/user.model.js"; // 💡 YOUR Parent Model Import
import mongoose from "mongoose";

import { logActivity } from "./activityLog.js";
/**
 * Checks a specific permission key (e.g., 'canPost') on the embedded Child document.
 * * @param {string} parentId - The ID of the parent.
 * @param {string} childId - The ID of the child performing the action.
 * @param {string} permissionKey - The exact key from the child.permissions object (e.g., 'canPost').
 * @returns {boolean} True if permitted, false otherwise.
 */
export async function checkChildPermission(parentId, childId, permissionKey) {
  if (!parentId || !childId || !permissionKey) {
    console.error("Permission check failed: Missing required parameters.");
    return false;
  }

  try {
    const parent = await User.findOne(
      { _id: new mongoose.Types.ObjectId(parentId) },
      {
        children: {
          $elemMatch: { _id: new mongoose.Types.ObjectId(childId) },
        },
      }
    ).lean();

    if (!parent || !parent.children || parent.children.length === 0) {
      return false;
    }

    const child = parent.children[0];

    return child.permissions && child.permissions[permissionKey] === true;
  } catch (error) {
    console.error(`Permission check failed for key ${permissionKey}:`, error);
    return false;
  }
}

/**
 * Enforces a child's permission setting for a parent-initiated action and logs the activity.
 * This function uses the checkChildPermission utility to validate the current permission status.
 * * @param {object} req The Express request object (to get user/parent ID).
 * @param {object} child The child sub-document (to get child ID and name).
 * @param {string} permissionKey The specific permission string (e.g., 'canAddSkills').
 * @param {string} activityType The type of activity for the log (e.g., 'PARENT_ADDED_CHILD_SKILL').
 * @param {string} message A base message describing the action.
 */
export async function enforcePermissionAndLog(
  req,
  child,
  permissionKey,
  activityType,
  message
) {
  const parentId = req.user._id;
  const childId = child._id;
  const childName = child.name;

  const isAllowed = checkChildPermission(parentId, childId, permissionKey);

  if (!isAllowed) {
    throw new ApiError(
      `Permission denied. The child's profile is currently configured to prevent self-management of '${permissionKey}'. The parent must update the child's permission settings first.`,
      403
    );
  }

  await logActivity(
    activityType,
    parentId,
    childId,
    childName,
    null,
    `${message}. Permission status (${permissionKey}): TRUE`
  );
}
