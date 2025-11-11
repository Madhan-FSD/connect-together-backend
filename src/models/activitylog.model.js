import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
    },
    childName: {
      type: String,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },
    type: {
      type: String,
      enum: [
        "POSTED",
        "LIKED",
        "COMMENTED",
        "WATCHED_VIDEO",
        "ENROLLED_COURSE",
        "JOINED_CHANNEL",
        "LOGIN",
        "LOGOUT",
        "POST_FAILED",
        "CREATED_CHANNEL",
        "USER_ACTIVITY",
        "CHILD_ADDED_SKILL",
        "PARENT_ADDED_SKILL",
        "CHILD_UPDATED_SKILL",
        "PARENT_UPDATED_SKILL",
        "CHILD_DELETED_SKILL",
        "PARENT_DELETED_SKILL",
        "CHILD_ADDED_INTEREST",
        "PARENT_ADDED_INTEREST",
        "CHILD_UPDATED_INTEREST",
        "PARENT_UPDATED_INTEREST",
        "CHILD_DELETED_INTEREST",
        "PARENT_DELETED_INTEREST",
        "CHILD_ADDED_CERTIFICATION",
        "PARENT_ADDED_CERTIFICATION",
        "CHILD_UPDATED_CERTIFICATION",
        "PARENT_UPDATED_CERTIFICATION",
        "CHILD_DELETED_CERTIFICATION",
        "PARENT_DELETED_CERTIFICATION",
        "CHILD_ADDED_PROJECT",
        "PARENT_ADDED_PROJECT",
        "CHILD_UPDATED_PROJECT",
        "PARENT_UPDATED_PROJECT",
        "CHILD_DELETED_PROJECT",
        "PARENT_DELETED_PROJECT",
        "PARENT_ADDED_ACHIEVEMENT",
        "CHILD_UPDATED_ACHIEVEMENT",
        "PARENT_UPDATED_ACHIEVEMENT",
        "CHILD_DELETED_ACHIEVEMENT",
        "PARENT_DELETED_ACHIEVEMENT",
        "PARENT_ADDED_EDUCATION",
        "CHILD_UPDATED_EDUCATION",
        "PARENT_UPDATED_EDUCATION",
        "CHILD_DELETED_EDUCATION",
        "PARENT_DELETED_EDUCATION",
        "CHILD_UPDATED_PROFILE",
        "PARENT_UPDATED_PROFILE",
        "CHILD_UPDATED_CORE_PROFILE",
      ],
      required: true,
    },
    contentReference: {
      type: mongoose.Schema.Types.ObjectId,
    },
    message: String,
    value: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
