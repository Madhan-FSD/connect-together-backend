const { OAuth2Client } = require("google-auth-library");
const USER = require("../../models/auth/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken)
      return res
        .status(400)
        .json({ success: false, message: "idToken is required" });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email not found in Google account" });

    let user = await USER.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.loginProvider = "google";
        user.isVerifed = true;
        await user.save();
      }
    } else {
      const plainPassword = uuidv4().slice(0, 8);
      const hashPassword = await bcrypt.hash(plainPassword, 10);

      const nameParts = name?.split(" ") || [];
      const firstName = nameParts[0] || "Google";
      const lastName = nameParts.slice(1).join(" ") || "User";

      user = await USER.create({
        userId: uuidv4(),
        firstName,
        lastName,
        email,
        phone: `google-${Date.now()}`,
        password: hashPassword,
        isVerifed: true,
        googleId,
        loginProvider: "google",
        photo: picture,
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      success: true,
      message: user.googleId
        ? "Google login successful"
        : "Google signup successful",
      token,
      user,
    });
  } catch (error) {
    console.log("Google Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: error.message,
    });
  }
};
