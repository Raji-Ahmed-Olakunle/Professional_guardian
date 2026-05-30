const express = require('express');
const chatbotController = require('../controllers/chatbotController');

const router = express.Router();

// POST /api/chatbot/ask
// body: { bookTitle, question, history? }
router.post('/ask', chatbotController.ask);

module.exports = router;

