import mongoose from "mongoose";
import ChildChannel from "../models/childchannel.model.js";
import { checkChildPermission } from "./permissions.js";
import { isWithinTimeWindow } from "./dateTimeHelpers.js";

/**
 * Core Guardrail: Checks all parental rules (general and channel-specific) before allowing content upload.
 * * @param {string} parentId - The Parent's ID.
 * @param {string} childId - The Child's ID.
 * @returns {object} { isAllowed: boolean, message: string, channel: ChildChannelDoc }
 */
export const checkUploadGuardrails = async (parentId, childId) => {
  const hasGeneralPermission = await checkChildPermission(
    parentId,
    childId,
    "canPost"
  );

  if (!hasGeneralPermission) {
    return {
      isAllowed: false,
      message:
        "Parental Control: General content upload permission is globally blocked by the parent.",
    };
  }

  const channel = await ChildChannel.findOne({ childId });

  if (!channel) {
    return {
      isAllowed: true,
      channel: null,
      message:
        "Channel settings missing. Upload permitted based on global parental approval.",
    };
  }

  const { uploadPermission, uploadTimeWindow } = channel;

  if (uploadPermission === "BLOCKED") {
    return {
      isAllowed: false,
      message: "Parental Control: Channel uploads are currently blocked.",
    };
  }

  if (uploadPermission === "LIMITED") {
    if (!isWithinTimeWindow(uploadTimeWindow)) {
      return {
        isAllowed: false,
        message:
          "Parental Control: Uploads are outside the permitted time and day window.",
      };
    }
  }

  return { isAllowed: true, channel, message: "Upload is permitted." };
};
