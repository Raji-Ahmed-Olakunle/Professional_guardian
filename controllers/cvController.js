const multer = require('multer');
const { processCv, getProfile, updateProfile } = require('../services/cvService');
const { success } = require('../utils/response');

// Store file in memory (no disk write — we only need the buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'), false);
    }
  },
});

const uploadMiddleware = upload.single('cv');

const uploadCv = async (req, res, next) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      const error = new Error(err.message || 'File upload failed');
      error.status = 400;
      return next(error);
    }

    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      return next(error);
    }

    try {
      const userId = req.user.id;
      const profession = req.user.profession;
      const profile = await processCv(userId, profession, req.file.buffer);
      success(res, { profile }, 201);
    } catch (err) {
      next(err);
    }
  });
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    if (!profile) {
      return success(res, { profile: null, isComplete: false });
    }
    success(res, { profile });
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await updateProfile(req.user.id, req.body);
    success(res, { profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadCv, getMyProfile, updateMyProfile };