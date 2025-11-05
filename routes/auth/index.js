const express = require("express");
const router = express.Router();
const Auth = require("../../controllers/auth/users");
const OTP = require("../../controllers/auth/otp");

router.post("/signup", Auth.signUp);
router.post("/signup-otp", OTP.getOtp);
router.post("/login", Auth.login);
router.post("/login-otp", OTP.verifyLoginOtp);

module.exports = router;
