




















































































































const UserProfile = require('../models/userProfile');
const { fetchFreshNewsWithTopics } = require('./newsService');
const { fetchFreshBooks } = require('./bookService');
const { getPersonalizedJobs } = require('./jobService');
const { invalidatePersonalCache } = require('./cacheService');

async function repersonalize(userId, profession) {
  const profile = await UserProfile.findOne({ userId });

  if (!profile || !profile.isComplete) {
    const err = new Error('CV profile required to repersonalize');
    err.status = 403;
    err.code = 'PROFILE_REQUIRED';
    throw err;
  }

  const newsTopics = profile.keywords?.news || [];
  const bookKeywords = profile.keywords?.books || [];

  console.log(`[Repersonalize] user:${userId} (${profession})`);
  console.log(`[Repersonalize] ${newsTopics.length} news topics, ${bookKeywords.length} book keywords`);

  if (newsTopics.length === 0) {
    const err = new Error('No news keywords found — please re-upload your CV');
    err.status = 400;
    throw err;
  }

  await invalidatePersonalCache(userId);

  
  
  

  
  
  

  
  
  

  
  

  
  
  

  
  
   
  
  const jobsPromise = getPersonalizedJobs(profile, userId).catch((err) => {
    console.error(`[Repersonalize] Jobs failed for user:${userId}:`, err.message);
    return null; 
  });

  console.log(`[Repersonalize] Fetching news with ${newsTopics.length} CV topics...`);
  await fetchFreshNewsWithTopics(profession, newsTopics, userId);

  
  
  console.log(`[Repersonalize] Fetching books with CV keywords: ${bookKeywords.join(', ')}...`);
  await fetchFreshBooks(profession, bookKeywords, userId);

  await jobsPromise; 

  console.log(`[Repersonalize] Done for user:${userId}`);
  return { success: true };
}

module.exports = { repersonalize };
