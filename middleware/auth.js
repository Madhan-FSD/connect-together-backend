const jwt = require("jsonwebtoken");
const USER = require("../models/auth/user");

exports.isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = await USER.findById(decoded.id).select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    req.user = {
      id: user._id,
      userId: user.userId,
      userType: user.userType,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.user.userType !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Access denied - Admin only" });
  }
  next();
};
