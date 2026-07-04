
























const { getPersonalizedNews } = require('../services/newsService');
const { success } = require('../utils/response');

const getPersonalized = async (req, res, next) => {
  try {
    console.log(req.user);
    const profession = req.user?.profession || req.query.q;
    const userId = req.user?.id || null;
 console.log(`[NewsController] getPersonalized called for user:${userId}, profession:${profession}`);
    if (!profession) {
      const err = new Error('Profession not found');
      err.status = 400;
      throw err;
    }

    
    const news = await getPersonalizedNews(profession, userId);
    success(res, { profession, news });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPersonalized };
