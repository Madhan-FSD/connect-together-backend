import express from "express";
import {
  register,
  verifyOtp,
  loginEmailCheck,
  sendOtp,
  login,
  loginChild,
} from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register new user, send OTP
 */
router.post("/register", register);

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP and activate account
 */
router.post("/verify-otp", verifyOtp);

/**
 * @route POST /api/auth/login-email-check
 * @desc Check email existence and get child list
 */
router.post("/login-email-check", loginEmailCheck);

/**
 * @route POST /api/auth/send-otp
 * @desc Send OTP for login
 */
router.post("/send-otp", sendOtp);

/**
 * @route POST /api/auth/login
 * @desc Login via OTP (Parent / Normal User)
 */
router.post("/login", login);

/**
 * @route POST /api/auth/login-child
 * @desc Login for Child Account (Parent + Child context)
 */
router.post("/login-child", loginChild);

export default router;
