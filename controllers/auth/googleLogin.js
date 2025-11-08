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

/**
 * Parse user's full name into first and last names
 */
const parseFullName = (fullName) => {
  const nameParts = fullName?.split(" ") || [];
  return {
    firstName: nameParts[0] || DEFAULT_FIRST_NAME,
    lastName: nameParts.slice(1).join(" ") || DEFAULT_LAST_NAME,
  };
};

/**
 * Generate a temporary password for Google users
 */
const generateTempPassword = async () => {
  const plainPassword = uuidv4().slice(0, TEMP_PASSWORD_LENGTH);
  const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
  return hashedPassword;
};

/**
 * Update existing user with Google credentials
 */
const updateExistingUser = async (user, googleId) => {
  if (!user.googleId) {
    user.googleId = googleId;
    user.loginProvider = LOGIN_PROVIDER;
    user.isVerifed = true;
    await user.save();
  }
  return user;
};

/**
 * Create new user from Google profile
 */
const createGoogleUser = async (googleProfile) => {
  const { googleId, email, name, picture } = googleProfile;
  const { firstName, lastName } = parseFullName(name);
  const hashedPassword = await generateTempPassword();

  return await USER.create({
    userId: uuidv4(),
    firstName,
    lastName,
    email,
    phone: `google-${Date.now()}`,
    password: hashedPassword,
    isVerifed: true,
    googleId,
    loginProvider: LOGIN_PROVIDER,
    photo: picture,
  });
};

/**
 * Generate JWT token for authenticated user
 */
const generateAuthToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
};

/**
 * Google Login/Signup Handler
 */
export const googleLogin = async (req, res) => {
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
