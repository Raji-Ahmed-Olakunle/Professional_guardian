/**
 * Standard JSON response helpers for controllers.
 *
 * Shape:
 * {
 *   success: boolean,
 *   data?: any,
 *   error?: { message: string, code?: string }
 * }
 */

function success(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

function fail(res, message, status = 400, code) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
    },
  });
}

module.exports = {
  success,
  fail,
};

