const { repersonalize } = require('../services/repersonalizeService');
const { success } = require('../utils/response');

const repersonalizeHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profession = req.user.profession;

    // Run in background — don't make user wait for all 3 fetches
    // Return immediately and let frontend poll or refresh
    res.status(202).json({
      success: true,
      data: { message: 'Repersonalization started. Your feed will update shortly.' },
    });

    // Fire and forget — errors logged but not sent to client
    repersonalize(userId, profession).catch((err) => {
      console.error(`[Repersonalize] Background error for user:${userId}:`, err.message);
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { repersonalizeHandler };