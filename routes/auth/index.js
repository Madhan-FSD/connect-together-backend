const express = require("express");
const router = express.Router();
const Auth = require("../../controllers/auth/users");
const onBoarding = require("../../controllers/auth/onBoarding");
const OTP = require("../../controllers/auth/otp");
const {
  validateSignUp,
  loginValidate,
} = require("../../validations/user.validate");
const { isAuthenticated } = require("../../middleware/auth");
const { updatePhoto } = require("../../controllers/photos/index");
const upload = require("../../middleware/upload");
const { googleLogin } = require("../../controllers/auth/googleLogin");

router.post("/signup", validateSignUp, Auth.signUp);
router.post("/signup/verify", OTP.verifySignUpOtp);
router.post("/login", loginValidate, Auth.login);
router.post("/login/verify", OTP.verifyLoginOtp);
router.post("/forgot", Auth.forgetPassword);
router.post("/forgot/reset", Auth.resetPassword);
router.post("/otp/resend", OTP.resendOtp);
router.post("/onboarding", onBoarding.onBoarding);
router.get("/profile", isAuthenticated, Auth.profile);
router.patch("/edit-profile", isAuthenticated, Auth.editProfile);
router.post("/update-photo", upload.single("photo"), updatePhoto);
router.post("/google-login", googleLogin);
module.exports = router;
