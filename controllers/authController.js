const authService = require('../services/authService');
const { success } = require('../utils/response');

const signup = async (req, res, next) => {
  try {
    const { user, token } = await authService.signup(req.body);
    success(
      res,
      {
        user,
        token,
      },
      201,
    );
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    success(res, { user, token });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    success(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  getMe,
};

