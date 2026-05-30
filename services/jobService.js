// const axios = require('axios');
// const { getCache, setCache } = require('./cacheService');

// const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
// const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

// if (!ADZUNA_APP_ID) throw new Error('ADZUNA_APP_ID is not set');
// if (!ADZUNA_APP_KEY) throw new Error('ADZUNA_APP_KEY is not set');

// // Adzuna country code map
// const COUNTRY_CODES = {
//   'united states': 'us', 'usa': 'us', 'us': 'us',
//   'united kingdom': 'gb', 'uk': 'gb', 'gb': 'gb',
//   'canada': 'ca', 'australia': 'au', 'germany': 'de',
//   'france': 'fr', 'india': 'in', 'singapore': 'sg',
//   'netherlands': 'nl', 'spain': 'es', 'italy': 'it',
//   'brazil': 'br', 'mexico': 'mx', 'south africa': 'za',
//   'nigeria': 'ng', 'kenya': 'ke',
// };

// function getCountryCode(location) {
//   if (!location) return 'gb'; // Adzuna default
//   const key = location.toLowerCase().trim();
//   return COUNTRY_CODES[key] || 'gb';
// }

// /**
//  * Search jobs using Adzuna API
//  *
//  * @param {object} params
//  * @param {string} params.query - job search query
//  * @param {string} params.location - country name
//  * @param {string} params.jobType - remote|onsite|hybrid|any
//  * @param {number} params.page
//  */
// async function searchJobs({ query, location, jobType = 'any', page = 1 }) {
//   const countryCode = getCountryCode(location);
// console.log(`[JobService] Searching jobs with query="${query}", location="${location}", jobType="${jobType}", countryCode="${countryCode}", page=${page}`);
// console.log(`[JobService] App ID: ${ADZUNA_APP_ID}`);
// console.log(`[JobService] App Key: ${ADZUNA_APP_KEY}`);
// const params = {
//     app_id: ADZUNA_APP_ID,
//     app_key: ADZUNA_APP_KEY,
//     results_per_page: 10,
//     what: query,
//     sort_by: 'relevance',
//     page,
//   };

//   // Add job type filter
//   if (jobType === 'remote') {
//     params.what = `${query} remote`;
//   } else if (jobType === 'onsite') {
//     params.what = query;
//   }

//   try {
//     const response = await axios.get(
//       `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}`,
//       { params, timeout: 15000 },
//     );
//     return (response.data?.results || []).map((job) => ({
//       jobId: job.id,
//       jobTitle: job.title,
//       company: job.company?.display_name || 'Unknown',
//       location: job.location?.display_name || location || 'Unknown',
//       country: countryCode.toUpperCase(),
//       salary: job.salary_min && job.salary_max
//         ? `${Math.round(job.salary_min / 1000)}k - ${Math.round(job.salary_max / 1000)}k`
//         : job.salary_min
//         ? `From ${Math.round(job.salary_min / 1000)}k`
//         : null,
//       description: job.description
//         ? `${job.description.slice(0, 300)}...`
//         : null,
//       url: job.redirect_url,
//       postedAt: job.created,
//       category: job.category?.label || null,
//       contractType: job.contract_type || null,
//       isRemote: job.title?.toLowerCase().includes('remote') ||
//                 job.description?.toLowerCase().includes('remote work') || false,
//     }));
//   } catch (error) {
//     console.error(`[JobService] Adzuna fetch failed:`, error.message);
//     return [];
//   }
// }


// // async function getPersonalizedJobs(profile) {
// //   const cacheKey = `jobs:${profile.keywords?.jobs?.join(',') || 'general'}`;

// //   // Check cache
// //   const cached = await getCache('jobs', cacheKey);
// //   if (cached) return cached;

// //   const jobQueries = profile.keywords?.jobs?.length
// //     ? profile.keywords.jobs
// //     : [profile.roles?.[0] || 'software engineer'];

// //   const location = profile.location || null;
// //   const jobType = profile.preferredJobType || 'any';

// //   // Fetch for each job query in parallel
// //   const fetchResults = await Promise.allSettled(
// //     jobQueries.map((query) =>
// //       searchJobs({ query, location, jobType }),
// //     ),
// //   );

// //   // Group results by query as category
// //   const sections = fetchResults
// //     .map((result, i) => ({
// //       category: jobQueries[i],
// //       jobs: result.status === 'fulfilled' ? result.value : [],
// //     }))
// //     .filter((s) => s.jobs.length > 0);

// //   if (sections.length > 0) {
// //     await setCache('jobs', cacheKey, sections, {
// //       cachedAt: new Date(),
// //     });
// //   }
//   async function getPersonalizedJobs(profile, userId = null) {
//   // Build cache key from job keywords + location + jobType
//   const cacheKeyStr = [
//     ...(profile.keywords?.jobs || []),
//     profile.location || 'global',
//     profile.preferredJobType || 'any',
//   ].join(':');

//   if (userId) {
//     const personal = await getPersonalCache('jobs', userId);
//     if (personal) return personal;
//   }

//   const jobQueries = profile.keywords?.jobs?.length
//     ? profile.keywords.jobs
//     : [profile.roles?.[0] || 'professional'];

//   const location = profile.location || null;
//   const jobType = profile.preferredJobType || 'any';

//   const fetchResults = await Promise.allSettled(
//     jobQueries.map((query) => searchJobs({ query, location, jobType })),
//   );

//   const sections = fetchResults
//     .map((result, i) => ({
//       category: jobQueries[i],
//       jobs: result.status === 'fulfilled' ? result.value : [],
//     }))
//     .filter((s) => s.jobs.length > 0);

//   if (sections.length > 0 && userId) {
//     await setPersonalCache('jobs', userId, sections, {
//       cachedAt: new Date(),
//     });
//   }

 
//   return sections;
// }

// module.exports = { getPersonalizedJobs, searchJobs };


const axios = require('axios');
const { getPersonalCache, setPersonalCache } = require('./cacheService');

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
if (!JSEARCH_API_KEY) throw new Error('JSEARCH_API_KEY is not set');

const jSearchClient = axios.create({
  baseURL: 'https://jsearch.p.rapidapi.com',
  timeout: 15000,
  headers: {
    'X-RapidAPI-Key': JSEARCH_API_KEY,
    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  },
});

// ─── Job type query builder ───────────────────────────────────────────────────

function buildQuery(baseQuery, jobType, location) {
  let query = baseQuery;

  // JSearch supports natural language queries — append type + location
  if (jobType === 'remote') {
    query = `${query} remote`;
  } else if (jobType === 'hybrid') {
    query = `${query} hybrid`;
  }

  // Append country/location for geo-filtering
  if (location) {
    query = `${query} in ${location}`;
  }

  return query;
}

// ─── Fetch jobs for a single query ───────────────────────────────────────────

async function searchJobs({ query, location, jobType = 'any', page = 1 }) {
  const builtQuery = buildQuery(query, jobType, location);

  try {
    const response = await jSearchClient.get('/search', {
      params: {
        query: builtQuery,
        page,
        num_pages: 1,
        date_posted: 'month', // jobs from last 30 days
        remote_jobs_only: jobType === 'remote' ? 'true' : 'false',
        employment_types: jobType === 'any'
          ? undefined
          : jobType === 'remote' || jobType === 'onsite'
          ? 'FULLTIME'
          : undefined,
      },
    });
    return (response.data?.data || []).map((job) => ({
      jobId: job.job_id,
      jobTitle: job.job_title,
      company: job.employer_name || 'Unknown',
      location: [job.job_city, job.job_state, job.job_country]
        .filter(Boolean)
        .join(', ') || location || 'Unknown',
      country: job.job_country || null,
      salary: job.job_min_salary && job.job_max_salary
        ? `${Math.round(job.job_min_salary / 1000)}k - ${Math.round(job.job_max_salary / 1000)}k ${job.job_salary_currency || ''}`
        : job.job_min_salary
        ? `From ${Math.round(job.job_min_salary / 1000)}k`
        : null,
      description: job.job_description
        ? `${job.job_description.slice(0, 300)}...`
        : null,
      url: job.job_apply_link || job.job_google_link,
      postedAt: job.job_posted_at_datetime_utc,
      category: job.job_category || null,
      contractType: job.job_employment_type || null,
      isRemote: job.job_is_remote || false,
      companyLogo: job.employer_logo || null,
    }));
  } catch (error) {
    console.error(
      `[JobService] JSearch failed for "${builtQuery}":`,
      error.message,
    );
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function getPersonalizedJobs(profile, userId = null) {
  // Check personal cache first
  if (userId) {
    const personal = await getPersonalCache('jobs', userId);
    if (personal) return personal;
  }

  const jobQueries = profile.keywords?.jobs?.length
    ? profile.keywords.jobs
    : [profile.roles?.[0] || 'professional'];

  const location = profile.location || null;
  const jobType = profile.preferredJobType || 'any';

  // Fetch all job queries in parallel
  const fetchResults = await Promise.allSettled(
    jobQueries.map((query) =>
      searchJobs({ query, location, jobType }),
    ),
  );

  // Deduplicate by jobId across all sections
  const seenIds = new Set();

  const sections = fetchResults
    .map((result, i) => ({
      category: jobQueries[i],
      jobs: result.status === 'fulfilled'
        ? result.value.filter((job) => {
            if (seenIds.has(job.jobId)) return false;
            seenIds.add(job.jobId);
            return true;
          })
        : [],
    }))
    .filter((s) => s.jobs.length > 0);

  if (sections.length > 0 && userId) {
    await setPersonalCache('jobs', userId, sections, {
      cachedAt: new Date(),
    });
  }

  return sections;
}

module.exports = { getPersonalizedJobs, searchJobs };