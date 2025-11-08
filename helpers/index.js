// it will generat a new 8 characters passwords
function generatedPassword() {
  return Math.random().toString(36).slice(-8);
}

// Otp Helper
function otpGenerator(expiresInMinutes = 2) {
  const otp = Math.floor(100000 + Math.random() * 90000);
  const otpExpiry = Date.now() + expiresInMinutes * 60 * 1000;
  return { otp, otpExpiry };
}

// All error catch handler
function errorHandlerResponse(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}

export default { generatedPassword, errorHandlerResponse, otpGenerator };
