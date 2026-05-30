// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Server error',
      code: err.code,
    },
  });
};

module.exports = errorHandler;

