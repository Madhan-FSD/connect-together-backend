const STATUS = {
  OK: 200,
  CREATED: 201,
  BAD: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

const responseHandler = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
  });
};

const errorResponse = (res, err, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message: err?.message || "Something went wrong",
  });
};

module.exports = { STATUS, responseHandler, errorResponse };
