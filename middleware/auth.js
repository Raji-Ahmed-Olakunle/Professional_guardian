const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 'No token provided', 401, 'NO_TOKEN');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return fail(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }
};

module.exports = auth;

