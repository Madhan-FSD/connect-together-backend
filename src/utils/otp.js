export function generateOTP(length = 6) {
  let digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

export function generateRandomPassword(len = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pw = "";
  for (let i = 0; i < len; i++)
    pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}
