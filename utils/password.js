const bcrypt = require("bcrypt");

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(inputPassword, savedPassword) {
  return await bcrypt.compare(inputPassword, savedPassword);
}

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

module.exports = { hashPassword, comparePassword, generatePassword };
