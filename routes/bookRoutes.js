const express = require('express');
const bookController = require('../controllers/bookController');
const authMiddleware=require("../middleware/auth")
const router = express.Router();

// Public: recommend books based on a search query/topic
// GET /api/books/recommendations?q=<topic>
router.get('/recommendations', authMiddleware, bookController.getRecommendations);
// router.get('/recommendations', (req,res)=>{
//     res.status(200).json({ message: 'Hello from book routes!' });
// });

module.exports = router;


//MONGO_URI=mongodb://localhost:27017/profession_guardian













