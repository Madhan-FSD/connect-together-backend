import { OAuth2Client } from "google-auth-library";
import USER from "../../models/auth/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

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

    // Validate input
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken is required",
      });
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Validate email from Google
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in Google account",
      });
    }

    // Check if user exists
    let user = await USER.findOne({ email });
    let isNewUser = false;

    if (user) {
      // Update existing user
      user = await updateExistingUser(user, googleId);
    } else {
      // Create new user
      user = await createGoogleUser({ googleId, email, name, picture });
      isNewUser = true;
    }

    // Generate authentication token
    const token = generateAuthToken(user);

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Google signup successful"
        : "Google login successful",
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
    console.error("Google Login Error:", error);

    // Handle specific Google auth errors
    if (error.message?.includes("Token used too late")) {
      return res.status(401).json({
        success: false,
        message: "Google token expired. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export { googleLogin };