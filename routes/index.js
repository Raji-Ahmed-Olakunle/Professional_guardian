const express = require('express');


const authRoutes = require('./authRoutes');
const newsRoutes = require('./newsRoutes');
const bookRoutes = require('./bookRoutes');
const chatbotRoutes = require('./chatbotRoutes');
const cvRoutes = require('./cvRoutes');
const jobRoutes = require('./jobRoutes');


const router = express.Router();
router.use('/auth', authRoutes);
router.use('/news', newsRoutes);
router.use('/books', bookRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/cv', cvRoutes);
router.use('/jobs', jobRoutes);
router.get('/', (req, res) => res.json({ message: 'API root' }));
module.exports = router;