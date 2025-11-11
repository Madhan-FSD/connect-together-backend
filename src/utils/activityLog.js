import ActivityLog from "../models/activitylog.model.js";

/**
 * Creates and saves a new audit log entry to the ActivityLog collection.
 * This function ensures all required monitoring IDs (parentId and childId) are recorded.
 * * @param {string} type - The activity type (must be one of the schema's ENUM values, e.g., 'POSTED').
 * @param {string} parentId - Mongoose ObjectId of the monitoring Parent.
 * @param {string} childId - Mongoose ObjectId of the Child whose activity is being logged (CRITICAL for lookups).
 * @param {string} childName - Name of the child profile (for display).
 * @param {string | null} contentReference - Mongoose ObjectId of the related content (e.g., Video._id or Channel._id).
 * @param {string | null} message - Descriptive log message.
 * @returns {Promise<object | null>} The saved log document or null on non-critical failure.
 */
export const logActivity = async (
  type,
  parentId,
  childId,
  childName,
  contentReference = null,
  message = null
) => {
  if (!type || !parentId || !childId || !childName) {
    console.error(
      "[AuditLog CRITICAL] Cannot log: Missing type, parentId, childId, or childName."
    );
    return null;
  }

  const logEntry = {
    parentId: parentId,
    childId: childId,
    childName: childName,
    type: type,
    contentReference: contentReference,
    message: message,
  };

  try {
    const newLog = await ActivityLog.create(logEntry);
    console.log(
      `[AuditLog SUCCESS] Logged activity ${newLog.type} for Child ID ${childId}.`
    );
    return newLog;
  } catch (error) {
    console.error(
      `[AuditLog FAILURE] Failed to save log entry. Details:`,
      error.message
    );
    return null;
  }
};
