const { OAuth2Client } = require("google-auth-library");
const USER = require("../../models/auth/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const {
  responseHandler,
  errorResponse,
  STATUS,
} = require("../../utils/responseHandler");

// Constants
const LOGIN_PROVIDER = "google";
const TOKEN_EXPIRY = "7d";
const BCRYPT_SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 8;
const DEFAULT_FIRST_NAME = "Google";
const DEFAULT_LAST_NAME = "User";

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken)
      return responseHandler(res, STATUS.BAD, "ID Token is required");

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email)
      return responseHandler(
        res,
        STATUS.BAD,
        "Google account does not have an email",
      );

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
      { id: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return responseHandler(res, STATUS.BAD, "Google login successful", {
      message: user.googleId
        ? "Google login successful"
        : "Google signup successful",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        photo: user.photo,
        loginProvider: user.loginProvider,
      },
    });
  } catch (error) {
    console.log("Google Login Error:", error);
    return errorResponse(res, error);
  }
};

export { googleLogin };
