import ActivityLog from "../models/activitylog.model.js";

/**
 * Logs an activity performed by the primary authenticated user (Parent or Normal User).
 * @param {string} type The category of the action (e.g., 'PROFILE_UPDATE', 'LOGIN').
 * @param {mongoose.Types.ObjectId} userId The ID of the user performing the action (req.user._id).
 * @param {string} message The descriptive message of the action (e.g., "YOU updated your skills").
 * @param {mongoose.Types.ObjectId} contentReference Optional ID of the document related to the action (e.g., a specific project ID).
 * @returns {Promise<UserActivityLog | null>} The created log entry or null on failure.
 */
export const logUserActivity = async (
  type,
  userId,
  message,
  contentReference = null
) => {
  if (!type || !userId || !message) {
    console.error(
      "[UserLog CRITICAL] Cannot log: Missing type, userId, or message content."
    );
    return null;
  }

  const logEntry = {
    type: type,
    userId: userId,
    message: message,
    contentReference: contentReference,
  };

  try {
    const newLog = await ActivityLog.create(logEntry);
    console.log(
      `[UserLog SUCCESS] Logged activity ${newLog.type} for User ID ${userId}: ${newLog.message}`
    );
    return newLog;
  } catch (error) {
    console.error(
      `[UserLog FAILURE] Failed to save user log entry. Details:`,
      error.message
    );
    return null;
  }
};
