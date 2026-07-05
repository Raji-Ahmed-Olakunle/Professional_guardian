























const { getBookRecommendations } = require('../services/bookService');
const { success } = require('../utils/response');

const getRecommendations = async (req, res, next) => {
  try {
    const profession = req.user?.profession || req.query.q;
    const userId = req.user?.id || null;

    if (!profession) {
      const err = new Error('Profession is required');
      err.status = 400;
      throw err;
    }

    const result = await getBookRecommendations(profession, userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRecommendations };