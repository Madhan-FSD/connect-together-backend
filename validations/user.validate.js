import VALIDATORS from "../helpers/index.js";
import { regex } from "../utils/regex.js";
const { errorHandlerResponse } = VALIDATORS;

function validateSignUp(req, res, next) {
  const { firstName, lastName, email, phone } = req.body;
  if (!firstName)
    return errorHandlerResponse(res, 400, "First Name is required");
  if (!lastName) return errorHandlerResponse(res, 400, "Last Name is required");
  if (!email)
    return errorHandlerResponse(res, 400, "Email address is required");
  if (!phone) return errorHandlerResponse(res, 400, "Phone number is required");
  if (!regex.nameRegex.test(firstName))
    return errorHandlerResponse(res, 400, "Invalid First Name");
  if (!regex.nameRegex.test(lastName))
    return errorHandlerResponse(res, 400, "Invalid Last Name");
  if (!regex.emailRegex.test(email))
    return errorHandlerResponse(res, 400, "Invalid Email Address");
  if (!regex.phoneRegex.test(phone))
    return errorHandlerResponse(res, 400, "Invalid Phone Number");
  next();
}

function loginValidate(req, res, next) {
  const { email } = req.body;
  if (!email) return errorHandlerResponse(res, 400, "Email is required");
  if (!regex.emailRegex.test(email)) {
    return errorHandlerResponse(res, 400, "Invalid Email Address");
  }

  next();
}

export { validateSignUp, loginValidate };
