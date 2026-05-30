const express = require('express');
const auth = require('../middleware/auth');
const { uploadCv, getMyProfile, updateMyProfile } = require('../controllers/cvController');
const { repersonalizeHandler } = require('../controllers/repersonalizeController');

const router = express.Router();

router.post('/upload', auth, uploadCv);
router.get('/profile', auth, getMyProfile);
router.patch('/profile', auth, updateMyProfile);
router.post('/repersonalize', auth, repersonalizeHandler);
module.exports = router;