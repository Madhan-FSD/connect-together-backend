const express = require("express");
const router = express.Router();
const Auth = require("../../controllers/auth/users");
const onBoarding = require("../../controllers/auth/onBoarding");
const OTP = require("../../controllers/auth/otp");
const {
  validateSignUp,
  loginValidate,
} = require("../../validations/user.validate");
const authMiddleware = require("../../middleware/auth");

router.post("/signup", validateSignUp, Auth.signUp);
router.post("/signup/verify", OTP.verifySignUpOtp);
router.post("/login", loginValidate, Auth.login);
router.post("/login/verify", OTP.verifyLoginOtp);
router.post("/forgot", Auth.forgetPassword);
router.post("/forgot/reset", Auth.resetPassword);
router.post("/otp/resend", OTP.resendOtp);
router.post("/onboarding", onBoarding.onBoarding);
router.get("/profile", authMiddleware, Auth.profile);

module.exports = router;
