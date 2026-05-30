const express = require('express');
//const authMiddleware = require('../middleware/authmiddleware');
const newsController = require('../controllers/newsController');
const authMiddleware=require("../middleware/auth")

const router = express.Router();

// Protected, personalized news endpoint
router.get('/personalized', authMiddleware, newsController.getPersonalized);

module.exports = router;

