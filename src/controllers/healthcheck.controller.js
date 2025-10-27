import { ApiResponse } from "../uitls/api-response.js";
import { asyncHandler } from "../uitls/async-handler.js";

const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "Server is Running" }));
});

export { healthCheck };
