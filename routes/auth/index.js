import express from "express";

// Controllers
import Auth from "../../controllers/auth/users.js";
import onBoarding from "../../controllers/auth/onBoarding.js";
import OTP from "../../controllers/auth/otp.js";
import { googleLogin } from "../../controllers/auth/googleLogin.js";
import { updatePhoto } from "../../controllers/photos/index.js";

// Middleware
import authMiddleware from "../../middleware/auth.js";
import upload from "../../middleware/upload.js";

// Validators
import {
  validateSignUp,
  loginValidate,
} from "../../validations/user.validate.js";

const router = express.Router();

// ============================
// Authentication Routes
// ============================

// Sign up flow
router.post("/signup", validateSignUp, Auth.signUp);
router.post("/signup/verify", OTP.verifySignUpOtp);

// Login flow
router.post("/login", loginValidate, Auth.login);
router.post("/login/verify", OTP.verifyLoginOtp);

// Password reset flow
router.post("/forgot", Auth.forgetPassword);
router.post("/forgot/reset", Auth.resetPassword);

// OTP management
router.post("/otp/resend", OTP.resendOtp);

// Social authentication
router.post("/google-login", googleLogin);

// ============================
// User Profile Routes (Protected)
// ============================

router.get("/profile", authMiddleware, Auth.profile);
router.patch("/profile/edit", authMiddleware, Auth.editProfile);
router.post(
  "/profile/photo",
  authMiddleware,
  upload.single("photo"),
  updatePhoto,
);

// ============================
// Onboarding Routes (Protected)
// ============================

router.post("/onboarding", authMiddleware, onBoarding.onBoarding);

export default router;
