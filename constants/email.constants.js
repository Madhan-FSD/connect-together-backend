/**
 * Email Template Constants
 */

// Company/Product Information
export const EMAIL_PRODUCT = {
  NAME: "Peer Plus",
  LINK: "https://peerplus.com",
  COPYRIGHT: "© 2025 Peer Plus. All rights reserved.",
  SUPPORT_EMAIL: "support@peerplus.com",
};

// Email Theme Configuration
export const EMAIL_THEME = "default";

// Common Email Configuration
const COMMON_EMAIL_CONFIG = {
  BUTTON_COLOR: "#667eea",
  DEFAULT_USER_NAME: "User",
};

// OTP Email Constants
export const OTP_EMAIL = {
  ...COMMON_EMAIL_CONFIG,
  VALIDITY: "2 minutes",
  VERIFY_LINK: "https://peerplus.com/verify",
  BUTTON_TEXT: "Verify My Account",

  // Email Content
  INTRO:
    "We've received a request to verify your Peer Plus account. Please use the following One-Time Password (OTP) to complete your verification:",
  INSTRUCTIONS:
    "Enter this OTP in the app or website to complete your verification.",
  OUTRO:
    "This OTP is confidential. Do not share it with anyone. If you did not request this code, please ignore this email or contact our support team immediately.",

  // Table Configuration
  TABLE_LABELS: {
    OTP_CODE: "Your OTP Code",
    VALIDITY: "Validity",
  },
};

// Password Reset Email Constants
export const PASSWORD_RESET_EMAIL = {
  ...COMMON_EMAIL_CONFIG,
  VALIDITY: "30 minutes",
  RESET_LINK: "https://peerplus.com/reset-password",
  BUTTON_TEXT: "Reset Password",
};

// Welcome Email Constants
export const WELCOME_EMAIL = {
  ...COMMON_EMAIL_CONFIG,
  BUTTON_TEXT: "Get Started Now",
  DASHBOARD_LINK: "https://peerplus.com/dashboard",

  // Email Content
  INTRO: "Welcome to Peer Plus! We're thrilled to have you on board.",
  INSTRUCTIONS:
    "To start exploring your Peer Plus account and connect with peers, click the button below:",
  OUTRO:
    "Need help or have any questions? Just reply to this email — our support team is here to assist you anytime.",

  // Table Configuration
  TABLE_LABELS: {
    ACCOUNT_NAME: "Account Name",
    REGISTERED_EMAIL: "Registered Email",
  },
};
