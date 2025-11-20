const USER = require("../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const sendOTP = require("../../helpers/sendOtpHandler");
const OTP = require("../../models/auth/otp");
const jwt = require("jsonwebtoken");
const {
  responseHandler,
  errorResponse,
  STATUS,
} = require("../../utils/responseHandler");
const {
  hashPassword,
  generatePassword,
  comparePassword,
} = require("../../utils/password");

export const signUp = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role } = req.body;

    const existUser = await USER.findOne({ email });
    if (existUser)
      return responseHandler(res, STATUS.BAD, "Email already exists");

    const existPhone = await USER.findOne({ phone });
    if (existPhone)
      return responseHandler(res, STATUS.BAD, "Phone number already exists");

    const plainPassword = generatePassword();
    const hash = await hashPassword(plainPassword);

    const allowedSignUpRoles = ["user", "entityAdmin", "StaffAdmin"];

    const finalRole = allowedSignUpRoles.includes(role) ? role : "user";

    await USER.create({
      userId: uuidv4(),
      firstName,
      lastName,
      email,
      phone,
      password: hash,
      role: { role: finalRole },
      audit: {
        createdBy: null,
        updatedBy: null,
        deletedBy: null,
        isActive: true,
        isDeleted: false,
        isVerified: false,
        hasChild: false,
      },
    });

    await sendOTP(email, firstName, "signup");

    return responseHandler(
      res,
      STATUS.CREATED,
      "User registered successfully. OTP sent to email for verification.",
    );
  } catch (error) {
    return errorResponse(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, userId, pin, loginType } = req.body;

    if (loginType === "password") {
      if (!email || !password) {
        return responseHandler(res, STATUS.BAD, "Email and password required");
      }

      let user = await USER.findOne({ email });

      if (!user.audit?.isVerified) {
        return responseHandler(res, STATUS.BAD, "Verify your account first");
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return responseHandler(res, STATUS.BAD, "Invalid credentials");
      }

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role?.role || "user",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return responseHandler(res, STATUS.OK, "Login successful", {
        token,
        role: user.role?.role,
        user,
      });
    }

    if (loginType === "otp") {
      if (!email) {
        return responseHandler(res, STATUS.BAD, "Email required for OTP login");
      }

      const user = await USER.findOne({ email });
      if (!user) {
        return responseHandler(res, STATUS.BAD, "User not registered");
      }

      if (!user.audit?.isVerified) {
        return responseHandler(res, STATUS.BAD, "Verify your account first");
      }

      await sendOTP(email, user.firstName, "login");
      return responseHandler(res, STATUS.OK, "OTP sent to email for login");
    }

    if (loginType === "child") {
      if (!userId || !pin) {
        return responseHandler(
          res,
          STATUS.BAD,
          "userId and PIN required for child login",
        );
      }

      const parent = await USER.findOne({ "children.userId": userId });
      if (!parent) {
        return responseHandler(
          res,
          STATUS.NOT_FOUND,
          "Child account not found",
        );
      }

      const child = parent.children.find((c) => c.userId === userId);

      if (!child || child.pin !== pin) {
        return responseHandler(res, STATUS.BAD, "Invalid child credentials");
      }

      const token = jwt.sign(
        {
          childId: child._id,
          parentId: parent._id,
          role: "child",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      return responseHandler(res, STATUS.OK, "Child login successful", {
        token,
        role: "child",
        token,
        child: {
          firstName: child.firstName,
          lastName: child.lastName,
          userId: child.userId,
          relation: child.relation,
        },
      });
    }

    return responseHandler(
      res,
      STATUS.BAD,
      "Invalid loginType. Use 'password', 'otp', or 'child'",
    );
  } catch (error) {
    console.error("Login Error:", error);
    return errorResponse(res, error);
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await USER.findOne({ email });

    if (!user) return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    await sendOTP(email, user.firstName, "forget");

    return responseHandler(
      res,
      STATUS.OK,
      "OTP sent to email for password reset",
    );
  } catch (error) {
    return errorResponse(res, error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpData = await OTP.findOne({ email, otpType: "forget" });

    if (!otpData) return responseHandler(res, STATUS.BAD, "OTP not found");
    if (otpData.otp !== Number(otp))
      return responseHandler(res, STATUS.BAD, "Invalid OTP");
    if (otpData.otpExpiry < Date.now())
      return responseHandler(res, STATUS.BAD, "OTP has expired");

    const hash = await hashPassword(newPassword);
    await USER.updateOne({ email }, { password: hash });
    await OTP.deleteOne({ email, otpType: "forget" });

    return responseHandler(res, STATUS.OK, "Password reset successfully");
  } catch (error) {
    return errorResponse(res, error);
  }
};

export default {
  signUp,
  login,
  forgetPassword,
  resetPassword,
  profile,
  editProfile,
};
