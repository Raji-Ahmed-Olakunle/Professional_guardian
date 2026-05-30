// newsService.js
const axios = require('axios');
const { generateProfessionTopics } = require('./geminiService');

// ─── Environment & Clients ────────────────────────────────────────────────────

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;

if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY environment variable is not set');
if (!GUARDIAN_API_KEY) throw new Error('GUARDIAN_API_KEY environment variable is not set');

const newsApiClient = axios.create({
  baseURL: process.env.NEWS_API_BASE_URL || 'https://newsapi.org/v2',
  timeout: 15000,
  headers: { 'X-Api-Key': NEWS_API_KEY },
});

const guardianClient = axios.create({
  baseURL: process.env.GUARDIAN_API_BASE_URL || 'https://content.guardianapis.com',
  timeout: 15000,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a title string for deduplication matching.
 * Mirrors normalizeTitle() from the books service.
 */
function normalizeTitle(str) {
  return (str || '').toLowerCase().trim();
}

/**
 * Fetch articles for one topic from NewsAPI /everything.
 *
 * @param {string} topic
 * @returns {Promise<Array>}
 */
async function fetchNewsApiArticles(topic) {
  try {
    const response = await newsApiClient.get('/everything', {
      params: {
        q: `"${topic}"`,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
      },
    });
    return response.data?.articles || [];
  } catch {
    // Partial failure: return empty so the topic isn't lost entirely
    return [];
  }
}

/**
 * Fetch articles for one topic from The Guardian /search.
 *
 * @param {string} topic
 * @returns {Promise<Array>}
 */
async function fetchGuardianArticles(topic) {
  try {
    const response = await guardianClient.get('/search', {
      params: {
        q: topic,
        'api-key': GUARDIAN_API_KEY,
        'show-fields': 'headline,trailText,thumbnail,shortUrl,publication,sectionName',
        'order-by': 'newest',
        'page-size': 10,
      },
    });
    return response.data?.response?.results || [];
  } catch {
    return [];
  }
}

/**
 * Normalise a raw NewsAPI article.
 *
 * @param {object} article  Raw NewsAPI article object
 * @param {object|null} guardianMatch  Matched Guardian result (or null)
 * @returns {object}
 */
function normalizeCombinedArticle(article, guardianMatch) {
  const gFields = guardianMatch?.fields || {};

  // Prefer Guardian's richer headline if available and titles match
  const title = article.title || gFields.headline || '';

  // Guardian's trailText is usually a fuller description than NewsAPI's description
  const summary = gFields.trailText || article.description || '';

  // Guardian thumbnails are often higher quality
  const imageUrl = gFields.thumbnail || article.urlToImage || null;

  // Merge source information from both APIs
  const sourceName = article.source?.name || gFields.publication || null;

  // Guardian provides a proper section name (e.g. "Technology", "Business")
  const category = gFields.sectionName || article.source?.name || null;

  return {
    newsDate: article.publishedAt || guardianMatch?.webPublicationDate || null,
    newsCategory: category,
    newsSource: sourceName,
    newsImageUrl: imageUrl,
    NewsTitle: title,
    NewsSummary: summary,
  };
}


function normalizeGuardianOnly(result) {
  const fields = result.fields || {};
  return {
    newsDate: result.webPublicationDate || null,
    newsCategory: fields.sectionName || result.sectionName || null,
    newsSource: fields.publication || 'The Guardian',
    newsImageUrl: fields.thumbnail || null,
    NewsTitle: fields.headline || result.webTitle || '',
    NewsSummary: fields.trailText || '',
  };
}

// ─── Core per-topic fetcher ───────────────────────────────────────────────────

/**
 * Fetch and merge news for a single topic from both APIs.
 * Mirrors the getBookRecommendations() merge pattern:
 *   - Build a Map of Guardian results keyed by normalised title
 *   - Walk NewsAPI results; enrich each with its Guardian match
 *   - Append any Guardian-only articles not matched by NewsAPI
 *
 * @param {string} topic
 * @returns {Promise<Array>}
 */
async function fetchMergedArticlesForTopic(topic) {
  // Fire both requests in parallel — mirrors Promise.all in the books service
  const [newsApiArticles, guardianResults] = await Promise.all([
    fetchNewsApiArticles(topic),
    fetchGuardianArticles(topic),
  ]);
  console.log(JSON.stringify(guardianResults, null, 2));
  console.log(JSON.stringify(newsApiArticles, null, 2));
  // console.log(`reesult from newsapi.org ${newsApiArticles[0]} and result from the guardian is ${guardianResults[0]}`)

  // Build a lookup map from Guardian results, keyed by normalised headline.
  // Mirrors: const googleByTitle = new Map() in the books service.
  const guardianByTitle = new Map();
  for (const result of guardianResults) {
    const key = normalizeTitle(result.fields?.headline || result.webTitle);
    if (key && !guardianByTitle.has(key)) {
      guardianByTitle.set(key, result);
    }
  }

  // Track which Guardian titles were consumed during the NewsAPI walk
  const matchedGuardianTitles = new Set();

  // Walk NewsAPI articles; enrich with Guardian data where titles match.
  // Mirrors: openLibraryDocs.map((doc) => { const googleMatch = ... })
  const mergedArticles = newsApiArticles.map((article) => {
    const key = normalizeTitle(article.title);
    const guardianMatch = key ? guardianByTitle.get(key) : undefined;
    if (guardianMatch) matchedGuardianTitles.add(key);
    return normalizeCombinedArticle(article, guardianMatch || null);
  });

  // Append Guardian-only articles that had no NewsAPI counterpart.
  // This ensures Guardian's unique coverage isn't discarded.
  for (const [key, result] of guardianByTitle.entries()) {
    if (!matchedGuardianTitles.has(key)) {
      mergedArticles.push(normalizeGuardianOnly(result));
    }
  }

  // Sort the combined list by date descending (newest first)
  mergedArticles.sort((a, b) => {
    const da = a.newsDate ? new Date(a.newsDate).getTime() : 0;
    const db = b.newsDate ? new Date(b.newsDate).getTime() : 0;
    return db - da;
  });

  return mergedArticles;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get personalised, sub-categorised news for a given profession.
 *
 * Each topic returned by Gemini becomes its own category key, populated
 * with articles merged from NewsAPI and The Guardian.
 *
 * Example response shape:
 * {
 *   Title: 'Personalised News for "Software Engineer"',
 *   categories: {
 *     "Artificial Intelligence": [ { NewsTitle, NewsSummary, ... }, ... ],
 *     "Cloud Computing":         [ ... ],
 *     "Cybersecurity":           [ ... ],
 *   }
 * }
 *
 * @param {string} profession
 * @returns {Promise<{ Title: string, categories: Record<string, Array> }>}
 */
async function getPersonalizedNews(profession) {
  if (!profession || typeof profession !== 'string') {
    const err = new Error('profession is required and must be a string');
    err.status = 400;
    throw err;
  }

  // Step 1 — Ask Gemini for relevant topics for this profession
  const topics = await generateProfessionTopics(profession);

  try {
    // Step 2 — Fetch + merge articles for every topic in parallel
    const results = await Promise.all(
      topics.map((topic) =>
        fetchMergedArticlesForTopic(topic).then((articles) => ({ topic, articles }))
      )
    );
    console.log(`results from merging is ${JSON.stringify(results, null, 2)}`)

    // Step 3 — Shape into the categorised response
    // Mirrors: return { Title: buildTitle(query), BookInfo: bookInfo }
    const categories = {};
    for (const { topic, articles } of results) {
      categories[topic] = articles;
    }

    return {
      Title: `Personalised News for "${profession}"`,
      categories,
    };
  } catch (error) {
    const err = new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to fetch news',
    );
    err.status = error.response?.status || 502;
    throw err;
  }
}

module.exports = {
  getPersonalizedNews,
};