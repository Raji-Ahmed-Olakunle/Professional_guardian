const { getPersonalizedJobs } = require('../services/jobService');
const { getProfile } = require('../services/cvService');
const { success } = require('../utils/response');

const getJobs = async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);

    if (!profile || !profile.isComplete) {
      const err = new Error('CV profile required to access job search');
      err.status = 403;
      err.code = 'PROFILE_REQUIRED';
      throw err;
    }

    const jobs = await getPersonalizedJobs(profile);
    success(res, { jobs });
  } catch (err) {
    next(err);
  }
};

module.exports = { getJobs };