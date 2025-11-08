import jwt from "jsonwebtoken";
import USER from "../models/auth/user.js";

export default async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id)
      return res
        .status(401)
        .json({ success: false, message: "Invalid token payload" });

    const user = await USER.findById(decoded.id).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Auth Error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
