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

    let user = await USER.findById(decoded.id).select("-password");

    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role?.role || "user",
      };
      return next();
    }

    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  } catch (err) {
    console.log("Auth Error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
