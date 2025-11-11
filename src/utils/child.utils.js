import { Child } from "../models/user.model.js";

export const getChildName = async (childId) => {
  try {
    const child = await Child.findById(childId).select("name -_id");

    return child ? child.name : "Unknown Child";
  } catch (error) {
    console.error("Error fetching child name for logging:", error);

    return `Error: ${childId}`;
  }
};

export const calculateAge = (dob) => {
  if (!dob) return undefined;
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  return Math.abs(age_dt.getUTCFullYear() - 1970);
};
