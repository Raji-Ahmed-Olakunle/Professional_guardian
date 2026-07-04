// // eslint-disable-next-line no-unused-vars
// const errorHandler = (err, req, res, next) => {
//   const status = err.status || err.statusCode || 500;

//   res.status(status).json({
//     success: false,
//     error: {
//       message: err.message || 'Server error',
//       code: err.code,
//     },
//   });
// };

// module.exports = errorHandler;
// middleware/errorHandler.js
//
// Replaces your existing errorHandler.
// Uses classifyError() from errorMapper.js to produce consistent responses.
//
// Response shape (unchanged — Flutter already parses this):
//   { success: false, error: { message: "...", code: "..." } }

'use strict';

const { classifyError } = require('../utils/errorMapper');

const errorHandler = (err, req, res, next) => {
  // Classify the error into { status, message, code }
  const { status, message, code } = classifyError(err);

  // Log full error in development, minimal in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${req.method} ${req.path} → ${status} ${code}: ${message}`);
    if (status === 500 || status === 502) {
      // Log the original error stack for unexpected errors only
      console.error(err);
    }
  } else {
    // Production: always log 5xx so you have visibility
    if (status >= 500) {
      console.error(`[Error] ${req.method} ${req.path} → ${status} ${code}: ${message}`);
    }
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code,
    },
  });
};

module.exports = errorHandler;
