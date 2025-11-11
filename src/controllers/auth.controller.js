import { User } from "../models/user.model.js";
import { generateOTP, generateRandomPassword } from "../utils/otp.js";
import { sendEmail } from "../utils/mailer.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const getRole = (user) => {
  return user.children && user.children.length > 0 ? "PARENT" : "NORMAL_USER";
};

export const register = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ error: "Email already registered" });

    const otp = generateOTP();
    const pwd = generateRandomPassword(10);
    const pwdHash = await bcrypt.hash(pwd, 10);

    user = new User({
      email,
      passwordHash: pwdHash,
      otp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      children: [],
    });

    const mailOptions = {
      email,
      subject: "Welcome to PeersPlus: Account Verification & Credentials",
      mailgenContent: {
        body: {
          intro:
            "Welcome to PeersPlus! Please use the following One-Time Password (OTP) and temporary password to verify your account and complete your first login:",
          table: {
            data: [
              {
                key: "Verification OTP",
                value: `<b>${otp}</b>`,
              },
              {
                key: "Temporary Password",
                value: `<b>${pwd}</b>`,
              },
            ],
            columns: {
              customWidth: {
                key: "40%",
                value: "60%",
              },
            },
          },
          action: {
            instructions:
              "Click the button below to go to our platform and enter the OTP on the verification screen to complete your registration.",
            button: {
              color: "#007bff",
              text: "Verify Account & Log In",
              link: "https://peersplus.com",
            },
          },
          outro:
            "This OTP is valid for 5 minutes. For security, please change your password immediately after your first successful login.",
        },
      },
    };

    const emailResult = await sendEmail(mailOptions);

    if (!emailResult) {
      console.error(`Registration failed for ${email}: Email sending failed.`);
      return res.status(503).json({
        error: "Failed to send verification email. Please try again.",
        reason: "EMAIL_SERVICE_FAILURE",
      });
    }

    await user.save();

    res.json({ message: "OTP and Temporary Password sent to email" });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account" });
    if (user.isVerified) return res.json({ message: "Already verified" });

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: "Account successfully verified. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const loginEmailCheck = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ hasAccount: false });

    const children = user.children.map((c) => ({
      id: c._id,
      name: c.name,
      age: c.age,
    }));

    if (!user.isVerified)
      return res.status(400).json({
        error: "Account not verified. Please verify your email first.",
      });

    res.json({ hasAccount: true, hasChildren: children.length > 0, children });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account" });
    if (!user.isVerified)
      return res.status(400).json({ error: "Account not verified." });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const mailOptions = {
      email,
      subject: "PeersPlus Login Verification Code",
      mailgenContent: {
        body: {
          intro: `Your one-time password (OTP) for PeersPlus login is:`,

          table: {
            data: [
              {
                key: "Login OTP",
                value: `<b>${otp}</b>`,
              },
            ],
            columns: {
              customWidth: {
                key: "40%",
                value: "60%",
              },
            },
          },
          outro:
            "This code is valid for 5 minutes. Do not share this code with anyone.",
        },
      },
    };

    const emailResult = await sendEmail(mailOptions);

    if (!emailResult) {
      console.error(`OTP send failed for ${email}: Email service failure.`);
      return res.status(503).json({
        error: "Failed to send login OTP. Please try again.",
        reason: "EMAIL_SERVICE_FAILURE",
      });
    }

    await user.save();

    res.json({ message: "Login OTP sent to email." });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(400)
        .json({ error: "No account found with this email." });
    if (!user.isVerified)
      return res.status(400).json({
        error: "Account not verified. Please verify your email first.",
      });

    if (!user.otp)
      return res.status(400).json({
        error: "Login OTP missing. Please request a new one with 'Send OTP'.",
        action: "SEND_OTP_REQUIRED",
      });

    const isOtpExpired = user.otpExpiry < new Date();
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (isOtpExpired)
      return res
        .status(400)
        .json({ error: "OTP expired. Please request a new one." });

    const role = getRole(user);

    const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const childrenData = user.children.map((child) => ({
      id: child._id,
      name: child.name,
      age: child.age,
      permissions: child.permissions,
    }));

    res.json({
      token,
      userId: user._id,
      name: user.name,
      role,
      children: childrenData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const loginChild = async (req, res) => {
  try {
    const { email, childName, accessCode } = req.body;
    if (!email || !childName || !accessCode)
      return res
        .status(400)
        .json({ error: "Email, child name, and access code required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });

    const child = user.children.find(
      (c) => c.name.toLowerCase() === childName.toLowerCase()
    );
    if (!child) return res.status(400).json({ error: "Invalid credentials." });

    const isValid = await user.verifyChildAccessCode(child, accessCode);
    if (!isValid)
      return res.status(400).json({ error: "Invalid credentials." });

    const token = jwt.sign(
      { userId: child._id, parentId: user._id, role: "CHILD" },
      process.env.JWT_SECRET || "changeme",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      child: {
        id: child._id,
        name: child.name,
        permissions: child.permissions,
      },
      role: "CHILD",
      parentId: user._id,
    });
  } catch (err) {
    console.error("Child login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
