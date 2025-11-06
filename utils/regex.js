const regex = {
  nameRegex: /^[A-Za-z]{2,30}$/,
  emailRegex: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  phoneRegex: /^\+[1-9]{1}[0-9]{1,14}$/,
};
module.exports = { regex };
