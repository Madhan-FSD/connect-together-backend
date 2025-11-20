import validator from "validator";
import { ApiError } from "./ApiError.js";

export const validateInput = (data, requiredFields = []) => {
  if (!data || typeof data !== "object") {
    throw new ApiError("Invalid data format provided.", 400);
  }

  for (const field of requiredFields) {
    if (!data[field] || validator.isEmpty(String(data[field]))) {
      throw new ApiError(`Missing required field: ${field}`, 400);
    }
  }

  for (const key in data) {
    const value = data[key];

    if (typeof value === "string" && !validator.isEmpty(value)) {
      if (
        validator.contains(value, "<script") ||
        validator.contains(value, "&lt;script")
      ) {
        throw new ApiError(
          `Invalid characters detected in field: ${key}. Input cannot contain script tags.`,
          400
        );
      }

      if (value.length > 5000) {
        throw new ApiError(
          `Input too long for field: ${key}. Max length is 5000 characters.`,
          400
        );
      }
    }
  }

  if (data.age !== undefined) {
    const ageString = String(data.age);

    if (!validator.isNumeric(ageString)) {
      throw new ApiError("Age must be a valid number.", 400);
    }

    if (!validator.isInt(ageString, { min: 1, max: 18 })) {
      throw new ApiError("Age must be an integer between 1 and 18.", 400);
    }
  }

  return data;
};
