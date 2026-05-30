const { askQuestion } = require('../services/chatbotService');
const { success } = require('../utils/response');

const ask = async (req, res, next) => {
  try {
    const {profession,  question,history } = req.body || {};

    const explanation = await askQuestion({ profession, question, history });

    success(res, {
      profession,
      question,
      explanation,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  ask,
};

