const express = require('express');
const authMiddleware=require("../middleware/auth")
const { getJobs } = require('../controllers/jobController');

const router = express.Router();

router.get('/', authMiddleware, getJobs);

module.exports = router;