

const axios = require('axios');
const { getPersonalCache, setPersonalCache } = require('./cacheService');

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
if (!JSEARCH_API_KEY) throw new Error('JSEARCH_API_KEY is not set');

// ─── Config ───────────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 60 * 60 * 6;   // 6 hours
const THROTTLE_DELAY_MS  = 1200;           // delay between sequential API calls
const RETRY_COUNT        = 3;              // max retries on 429
const RETRY_BASE_DELAY   = 1000;           // 1s → 2s → 4s

// ─── Axios client ─────────────────────────────────────────────────────────────

const jSearchClient = axios.create({
  baseURL: 'https://jsearch.p.rapidapi.com',
  timeout: 20000,
  headers: {
    'X-RapidAPI-Key': JSEARCH_API_KEY,
    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  },
});

// ─── Retry helper (exponential backoff on 429) ────────────────────────────────

async function fetchWithRetry(path, params, retries = RETRY_COUNT, baseDelay = RETRY_BASE_DELAY) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await jSearchClient.get(path, { params });
    } catch (error) {
      const is429  = error.response?.status === 429;
      const isLast = attempt === retries - 1;

      if (!is429 || isLast) throw error;

      const delay = baseDelay * 2 ** attempt; // 1000ms, 2000ms, 4000ms
      console.warn(
        `[JobService] Rate limited (429). Retrying in ${delay}ms… (attempt ${attempt + 1}/${retries})`,
      );
      await sleep(delay);
    }
  }
}

// ─── Throttled sequential fetcher ────────────────────────────────────────────
// Replaces Promise.allSettled — fires one query at a time with a delay between
// each to avoid bursting the RapidAPI rate limit.

async function throttledSearch(queries, location, jobType) {
  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    try {
      const jobs = await searchJobs({
        query,
        location,
        jobType,
      });

      results.push({
        status: "fulfilled",
        value: jobs,
      });
    } catch (err) {
      console.error(
        `[JobService] Query "${query}" failed:`,
        err.message,
      );

      results.push({
        status: "rejected",
        reason: err,
      });
    }

    if (i < queries.length - 1) {
      await sleep(THROTTLE_DELAY_MS);
    }
  }

  return results;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Job type query builder ───────────────────────────────────────────────────

function buildQuery(baseQuery, jobType, location) {
  let query = baseQuery.trim();

  if (jobType === "remote") {
    query += " remote";
  } else if (jobType === "hybrid") {
    query += " hybrid";
  }

  if (
    location &&
    !query.toLowerCase().includes(location.toLowerCase())
  ) {
    query += ` in ${location}`;
  }

  return query;
}

// ─── Fetch jobs for a single query ───────────────────────────────────────────

async function searchJobs({ query, location, jobType = 'any', page = 1 }) {
  const builtQuery = buildQuery(query, jobType, location);

  try {
    const response = await fetchWithRetry('/search', {
      query: builtQuery,
      page,
      num_pages: 1,
      date_posted: 'month',
      remote_jobs_only: jobType === 'remote' ? 'true' : 'false',
      employment_types:
        jobType === 'any'
          ? undefined
          : jobType === 'remote' || jobType === 'onsite'
          ? 'FULLTIME'
          : undefined,
    });

    return (response.data?.data || []).map((job) => ({
      jobId: job.job_id,
      jobTitle: job.job_title,
      company: job.employer_name || 'Unknown',
      location: [job.job_city, job.job_state, job.job_country]
        .filter(Boolean)
        .join(', ') || location || 'Unknown',
      country: job.job_country || null,
      salary:
        job.job_min_salary && job.job_max_salary
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
      error.response?.status ?? error.message,
    );

    throw error;
}
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function getPersonalizedJobs(profile, userId = null) {
  // 1. Return cached result if available
  if (userId) {
    const cached = await getPersonalCache('jobs', userId);
    if (cached) {
      console.info(`[JobService] Returning cached jobs for user ${userId}`);
      return cached;
    }
  }

  const jobQueries = profile.keywords?.jobs?.length
    ? profile.keywords.jobs
    : [profile.roles?.[0] || 'professional'];

  const location = profile.location || null;
  const jobType  = profile.preferredJobType || 'any';

  // 2. Fetch queries one-at-a-time with throttling + per-call retry
  const fetchResults = await throttledSearch(jobQueries, location, jobType);

  // 3. Deduplicate by jobId across all sections
  const seenIds = new Set();

  const sections = fetchResults
    .map((result, i) => ({
      category: jobQueries[i],
      jobs:
        result.status === 'fulfilled'
          ? result.value.filter((job) => {
              if (seenIds.has(job.jobId)) return false;
              seenIds.add(job.jobId);
              return true;
            })
          : [],
    }))
    .filter((s) => s.jobs.length > 0);

  // 4. Surface a clean error if nothing came back
  if (sections.length === 0) {
    const err = new Error(
      'No job listings could be retrieved at this time. Please try again later.',
    );
    err.status = 502;
    err.code    = 'JOBS_UNAVAILABLE';
    throw err;
  }

  // 5. Cache the result for future requests
  if (userId) {
    await setPersonalCache('jobs', userId, sections, {
      cachedAt: new Date(),
      ttl: CACHE_TTL_SECONDS,
    });
  }

  return sections;
}

module.exports = { getPersonalizedJobs, searchJobs };