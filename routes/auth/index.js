const express = require("express");
const router = express.Router();
const Auth = require("../../controllers/auth/users");
const onBoarding = require("../../controllers/auth/onBoarding");
const OTP = require("../../controllers/auth/otp");
const PROFILE = require("../../controllers/auth/profile");
const {
  validateSignUp,
  loginValidate,
} = require("../../validations/user.validate");
const { isAuthenticated } = require("../../middleware/auth");
const { updatePhoto } = require("../../controllers/photos/index");
const upload = require("../../middleware/upload");
const { googleLogin } = require("../../controllers/auth/googleLogin");

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
router.post("/onboarding", onBoarding.onBoarding);
router.get("/profile", isAuthenticated, PROFILE.profile);
router.patch("/edit-profile", isAuthenticated, PROFILE.editProfile);
router.post("/update-photo", upload.single("photo"), updatePhoto);

// ============================
// Onboarding Routes (Protected)
// ============================

router.post("/onboarding", authMiddleware, onBoarding.onBoarding);

export default router;
