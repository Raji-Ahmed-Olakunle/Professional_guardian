const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Backward-compatible alias (if any clients use /register)
router.post('/register', authController.signup);

// Protected route
router.get('/me', auth, authController.getMe);

module.exports = router;

