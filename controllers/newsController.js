// const { getPersonalizedNews } = require('../services/newsService');
// const { success } = require('../utils/response');

// const getPersonalized = async (req, res, next) => {
//   try {
//     // const profession = req.user?.profession;
//     const profession= req.query.q;

//     if (!profession) {
//       const err = new Error('Profession not found in user token');
//       err.status = 400;
//       throw err;
//     }

//     const news = await getPersonalizedNews(profession);
//     success(res, { profession, news });
//   } catch (err) {
//     next(err);
//   }
// };

// module.exports = {
//   getPersonalized,
// };

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

    // Pass userId so it checks personal cache first
    const news = await getPersonalizedNews(profession, userId);
    success(res, { profession, news });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPersonalized };
