// const axios = require('axios');
// const { generateProfessionTopics } = require('./geminiService');

// const NEWS_API_KEY = process.env.NEWS_API_KEY;

// if (!NEWS_API_KEY) {
//   throw new Error('NEWS_API_KEY environment variable is not set');
// }

// const newsClient = axios.create({
//   baseURL:
//     process.env.NEWS_API_BASE_URL || 'https://newsapi.org/v2',
//   timeout: 15000,
//   headers: {
//     'X-Api-Key': NEWS_API_KEY,
//   },
// });

// /**
//  * Build a NewsAPI query string from topics.
//  */
// function buildQueryFromTopics(topics) {
//   return topics
//     .map((t) => `"${t}"`)
//     .join(' OR ');
// }

// /**
//  * Normalize a NewsAPI article into the required shape.
//  */
// function normalizeArticle(article) {
//   return {
//     newsDate: article.publishedAt || null,
//     newsCategory: article.source?.name || null,
//     newsSource: article.source?.name || null,
//     newsImageUrl: article.urlToImage || null,
//     NewsTitle: article.title || '',
//     NewsSummary: article.description || '',
//   };
// }

// /**
//  * Get personalized news for a given profession.
//  *
//  * @param {string} profession
//  * @returns {Promise<Array>}
//  */
// async function getPersonalizedNews(profession) {
//   const topics = await generateProfessionTopics(profession);

//   const q = buildQueryFromTopics(topics);

//   try {
//     const response = await newsClient.get('/everything', {
//       params: {
//         q,
//         language: 'en',
//         sortBy: 'publishedAt',
//         pageSize: 20,
//       },
//     });

//     const articles = response.data?.articles || [];
//     return articles.map(normalizeArticle);
//   } catch (error) {
//     const err = new Error(
//       error.response?.data?.message ||
//         error.message ||
//         'Failed to fetch news',
//     );
//     err.status = error.response?.status || 502;
//     throw err;
//   }
// }

// module.exports = {
//   getPersonalizedNews,
// };

// const axios = require('axios');
// const { generateNewsTopics, filterAndCategorizeNews } = require('./geminiService');

// const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
// const NEWS_API_KEY = process.env.NEWS_API_KEY;

// if (!GUARDIAN_API_KEY) throw new Error('GUARDIAN_API_KEY is not set');
// if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY is not set');

// // ─── API clients ──────────────────────────────────────────────────────────────

// const guardianClient = axios.create({
//   baseURL: 'https://content.guardianapis.com',
//   timeout: 10000,
// });

// const newsApiClient = axios.create({
//   baseURL: 'https://newsapi.org/v2',
//   timeout: 10000,
// });

// // ─── Date helpers ─────────────────────────────────────────────────────────────

// function getDateDaysAgo(days) {
//   const d = new Date();
//   d.setDate(d.getDate() - days);
//   return d.toISOString().split('T')[0];
// }

// function getTodayDate() {
//   return new Date().toISOString().split('T')[0];
// }

// // ─── Individual API fetchers ──────────────────────────────────────────────────

// async function fetchFromGuardian(topic) {
//   try {
//     const response = await guardianClient.get('/search', {
//       params: {
//         q: topic,
//         'api-key': GUARDIAN_API_KEY,
//         'show-fields':
//           'headline,trailText,thumbnail,shortUrl,byline,sectionName,publication',
//         'show-tags': 'keyword',
//         'order-by': 'relevance',
//         'from-date': getDateDaysAgo(30),
//         'to-date': getTodayDate(),
//         'page-size': 8,
//         'use-date': 'published',
//       },
//     });

//     return (response.data?.response?.results || []).map((item) => ({
//       title: item.fields?.headline || item.webTitle,
//       description: item.fields?.trailText || '',
//       url: item.fields?.shortUrl || item.webUrl,
//       imageUrl: item.fields?.thumbnail || null,
//       source: 'The Guardian',
//       sourceLogo:
//         'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
//       publishedAt: item.webPublicationDate,
//       section: item.fields?.sectionName || '',
//       tags: (item.tags || []).map((t) => t.webTitle).slice(0, 3),
//     }));
//   } catch (error) {
//     console.error(`Guardian fetch failed for topic "${topic}":`, error.message);
//     return [];
//   }
// }

// async function fetchFromNewsApi(topic) {
//   try {
//     const response = await newsApiClient.get('/everything', {
//       params: {
//         q: `"${topic}"`,
//         language: 'en',
//         sortBy: 'relevancy',
//         searchIn: 'title,description',
//         from: getDateDaysAgo(14),
//         to: getTodayDate(),
//         pageSize: 8,
//         apiKey: NEWS_API_KEY,
//       },
//     });

//     return (response.data?.articles || [])
//       .filter((a) => a.title && a.title !== '[Removed]') // filter deleted articles
//       .map((item) => ({
//         title: item.title,
//         description: item.description || '',
//         url: item.url,
//         imageUrl: item.urlToImage || null,
//         source: item.source?.name || 'NewsAPI',
//         sourceLogo: `https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.url).hostname}`,
//         publishedAt: item.publishedAt,
//         section: '',
//         tags: [],
//       }));
//   } catch (error) {
//     console.error(`NewsAPI fetch failed for topic "${topic}":`, error.message);
//     return [];
//   }
// }

// // ─── Deduplication ────────────────────────────────────────────────────────────

// function deduplicateArticles(articles) {
//   const seen = new Set();
//   return articles.filter(({ url, title }) => {
//     const key = url || title;
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });
// }

// // ─── Format published date ────────────────────────────────────────────────────

// function formatDate(dateStr) {
//   if (!dateStr) return '';
//   return new Date(dateStr).toLocaleDateString('en-GB', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   }); // "25 Mar 2026"
// }

// // ─── Main service function ────────────────────────────────────────────────────

// /**
//  * Get personalized news for a profession.
//  * 1. Gemini generates broad topics
//  * 2. Fetch broadly from Guardian + NewsAPI in parallel
//  * 3. Gemini filters and categorizes results
//  * 4. Return structured sections
//  *
//  * @param {string} profession
//  * @returns {Promise<Array<{ sectionHeading: string, content: object[] }>>}
//  */
// async function getPersonalizedNews(profession) {
//   // Step 1: Gemini generates broad topics
//   const topics = await generateNewsTopics(profession);

//   // Step 2: Fetch from both APIs in parallel for all topics
//   const fetchPromises = topics.flatMap((topic) => [
//     fetchFromGuardian(topic),
//     fetchFromNewsApi(topic),
//   ]);

//   const rawResults = await Promise.allSettled(fetchPromises);

//   // Flatten and deduplicate
//   const allArticles = deduplicateArticles(
//     rawResults
//       .filter((r) => r.status === 'fulfilled')
//       .flatMap((r) => r.value),
//   );

//   if (allArticles.length === 0) {
//     return [];
//   }

//   // Step 3: Gemini filters and categorizes
//   // Only send title + description to Gemini to keep prompt small
//   const articlesForGemini = allArticles.map((a) => ({
//     title: a.title,
//     description: a.description,
//   }));

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini);

//   // Step 4: Map indexes back to full articles and format response
//   return categorized.map(({ category, indexes }) => ({
//     sectionHeading: category,
//     content: indexes
//       .filter((i) => i >= 0 && i < allArticles.length) // guard invalid indexes
//       .map((i) => {
//         const a = allArticles[i];
//         return {
//           newsDate: formatDate(a.publishedAt),
//           newsCategory: a.tags?.length ? a.tags : [category],
//           newsSource: a.source,
//           newsLogoUrl: a.sourceLogo,
//           newsImageUrl: a.imageUrl,
//           newsTitle: a.title,
//           newsSummary: a.description,
//           newsUrl: a.url,
//         };
//       }),
//   }));
// }

// module.exports = { getPersonalizedNews };

// const axios = require('axios');
// const { generateNewsTopics, filterAndCategorizeNews } = require('./geminiService');

// const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
// const NEWS_API_KEY = process.env.NEWS_API_KEY;

// if (!GUARDIAN_API_KEY) throw new Error('GUARDIAN_API_KEY is not set');
// if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY is not set');

// // ─── Clients ──────────────────────────────────────────────────────────────────

// const guardianClient = axios.create({
//   baseURL: 'https://content.guardianapis.com',
//   timeout: 10000,
// });

// const newsApiClient = axios.create({
//   baseURL: 'https://newsapi.org/v2',
//   timeout: 10000,
// });

// // ─── Date helpers ─────────────────────────────────────────────────────────────

// function getDateDaysAgo(days) {
//   const d = new Date();
//   d.setDate(d.getDate() - days);
//   return d.toISOString().split('T')[0];
// }

// function getTodayDate() {
//   return new Date().toISOString().split('T')[0];
// }

// function formatDate(dateStr) {
//   if (!dateStr) return '';
//   return new Date(dateStr).toLocaleDateString('en-GB', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// }

// // ─── Guardian fetcher ─────────────────────────────────────────────────────────
// // Strength: reliable structure, full trailText, byline, deep archive,
// //           keyword tags we can use directly as newsCategory

// async function fetchFromGuardian(topic) {
//   try {
//     const response = await guardianClient.get('/search', {
//       params: {
//         q: topic,
//         'api-key': GUARDIAN_API_KEY,
//         'show-fields': 'headline,trailText,thumbnail,shortUrl,byline,sectionName',
//         'show-tags': 'keyword',         // rich keyword tags → newsCategory
//         'order-by': 'relevance',        // relevance beats newest for quality
//         'from-date': getDateDaysAgo(30),// Guardian free tier has full archive
//         'to-date': getTodayDate(),
//         'page-size': 8,
//         'use-date': 'published',
//       },
//     });

//     return (response.data?.response?.results || []).map((item) => ({
//       title: item.fields?.headline || item.webTitle,
//       description: item.fields?.trailText || '',
//       url: item.fields?.shortUrl || item.webUrl,
//       imageUrl: item.fields?.thumbnail || null,
//       source: 'The Guardian',
//       sourceLogo: 'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
//       publishedAt: item.webPublicationDate,
//       // Guardian's keyword tags are high quality — use them directly
//       tags: (item.tags || []).map((t) => t.webTitle).slice(0, 3),
//       byline: item.fields?.byline || null,
//       section: item.fields?.sectionName || '',
//       provider: 'guardian',
//     }));
//   } catch (error) {
//     console.error(`Guardian fetch failed for "${topic}":`, error.message);
//     return [];
//   }
// }

// // ─── NewsAPI fetcher ──────────────────────────────────────────────────────────
// // Strength: broad source coverage (TechCrunch, Wired, Bloomberg, Ars Technica
// //           all in one call), good for catching stories Guardian won't cover

// async function fetchFromNewsApi(topic) {
//   try {
//     const response = await newsApiClient.get('/everything', {
//       params: {
//         q: `"${topic}"`,              // exact phrase match for relevance
//         language: 'en',
//         sortBy: 'relevancy',          // relevancy > publishedAt for quality
//         searchIn: 'title,description',// avoids false matches in article body
//         from: getDateDaysAgo(14),     // NewsAPI free tier: 30 day limit
//         to: getTodayDate(),
//         pageSize: 8,
//         apiKey: NEWS_API_KEY,
//       },
//     });

//     return (response.data?.articles || [])
//       .filter((a) => a.title && a.title !== '[Removed]') // filter deleted articles
//       .map((item) => {
//         let sourceLogo = null;
//         try {
//           sourceLogo = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.url).hostname}`;
//         } catch {
//           sourceLogo = null;
//         }

//         return {
//           title: item.title,
//           description: item.description || '',
//           url: item.url,
//           imageUrl: item.urlToImage || null,
//           source: item.source?.name || 'NewsAPI',
//           sourceLogo,
//           publishedAt: item.publishedAt,
//           // NewsAPI doesn't provide tags — leave empty, Gemini will categorize
//           tags: [],
//           byline: item.author || null,
//           section: '',
//           provider: 'newsapi',
//         };
//       });
//   } catch (error) {
//     console.error(`NewsAPI fetch failed for "${topic}":`, error.message);
//     return [];
//   }
// }

// // ─── Merge strategy ───────────────────────────────────────────────────────────
// // Guardian articles are preferred when both cover the same story because
// // Guardian has richer metadata (tags, byline, trailText). NewsAPI fills the
// // gaps with broader source coverage.

// function mergeAndDeduplicate(guardianArticles, newsApiArticles) {
//   const seen = new Set();
//   const result = [];

//   // Guardian first — higher quality metadata
//   for (const article of guardianArticles) {
//     const key = article.url || article.title;
//     if (!seen.has(key)) {
//       seen.add(key);
//       result.push(article);
//     }
//   }

//   // NewsAPI second — fills coverage gaps
//   for (const article of newsApiArticles) {
//     const key = article.url || article.title;
//     // Also deduplicate by normalized title to catch same story from both sources
//     const titleKey = article.title?.toLowerCase().slice(0, 60);
//     if (!seen.has(key) && !seen.has(titleKey)) {
//       seen.add(key);
//       seen.add(titleKey);
//       result.push(article);
//     }
//   }

//   return result;
// }

// // ─── Main ─────────────────────────────────────────────────────────────────────

// /**
//  * Get personalized news for a profession.
//  *
//  * Flow:
//  * 1. Gemini generates 5 broad topics for the profession
//  * 2. For each topic, fetch from Guardian + NewsAPI in parallel
//  * 3. Merge — Guardian preferred, NewsAPI fills gaps
//  * 4. Gemini filters irrelevant articles and assigns final categories
//  * 5. Return structured sections
//  *
//  * @param {string} profession
//  * @returns {Promise<Array<{ sectionHeading: string, content: object[] }>>}
//  */
// async function getPersonalizedNews(profession) {
//   // Step 1: Gemini generates broad topics
//   const topics = await generateNewsTopics(profession);

//   // Step 2: Fetch from both APIs in parallel for every topic
//   const fetchResults = await Promise.allSettled(
//     topics.flatMap((topic) => [
//       fetchFromGuardian(topic),
//       fetchFromNewsApi(topic),
//     ]),
//   );

//   // Separate Guardian and NewsAPI results
//   const guardianArticles = [];
//   const newsApiArticles = [];

//   fetchResults.forEach((result, index) => {
//     if (result.status !== 'fulfilled') return;
//     // Even indexes = Guardian, odd indexes = NewsAPI (due to flatMap order)
//     if (index % 2 === 0) {
//       guardianArticles.push(...result.value);
//     } else {
//       newsApiArticles.push(...result.value);
//     }
//   });

//   // Step 3: Merge with Guardian preferred
//   const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles);

//   if (allArticles.length === 0) return [];

//   // Step 4: Gemini filters and categorizes
//   // Only send title + description to keep Gemini prompt small
//   const articlesForGemini = allArticles.map((a) => ({
//     title: a.title,
//     description: a.description,
//   }));

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini);

//   // Step 5: Map indexes back to full articles
//   return categorized.map(({ category, indexes }) => ({
//     sectionHeading: category,
//     content: indexes
//       .filter((i) => i >= 0 && i < allArticles.length)
//       .map((i) => {
//         const a = allArticles[i];
//         return {
//           newsDate: formatDate(a.publishedAt),
//           // Guardian tags are rich; NewsAPI gets category name as fallback
//           newsCategory: a.tags?.length ? a.tags : [category],
//           newsSource: a.source,
//           newsLogoUrl: a.sourceLogo,
//           newsImageUrl: a.imageUrl,
//           newsTitle: a.title,
//           newsSummary: a.description,
//           newsUrl: a.url,
//           newsByline: a.byline,
//         };
//       }),
//   }));
// }

// module.exports = { getPersonalizedNews };

// const axios = require('axios');
// const { generateNewsTopics, filterAndCategorizeNews } = require('./geminiService');
// const { getCache, setCache } = require('./cacheService');

// const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
// const NEWS_API_KEY = process.env.NEWS_API_KEY;

// if (!GUARDIAN_API_KEY) throw new Error('GUARDIAN_API_KEY is not set');
// if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY is not set');

// const guardianClient = axios.create({
//   baseURL: 'https://content.guardianapis.com',
//   timeout: 60000,
// });

// const newsApiClient = axios.create({
//   baseURL: 'https://newsapi.org/v2',
//   timeout: 60000,
// });

// function getDateDaysAgo(days) {
//   const d = new Date();
//   d.setDate(d.getDate() - days);
//   return d.toISOString().split('T')[0];
// }

// function getTodayDate() {
//   return new Date().toISOString().split('T')[0];
// }

// function formatDate(dateStr) {
//   if (!dateStr) return '';
//   return new Date(dateStr).toLocaleDateString('en-GB', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// }

// async function fetchFromGuardian(topic) {
//   try {
//     const response = await guardianClient.get('/search', {
//       params: {
//         q: topic,
//         'api-key': GUARDIAN_API_KEY,
//         'show-fields': 'headline,trailText,standfirst,thumbnail,shortUrl,byline,sectionName',
//         'show-tags': 'keyword',
//         'order-by': 'relevance',
//         'from-date': getDateDaysAgo(30),
//         'to-date': getTodayDate(),
//         'page-size': 10,
//         'use-date': 'published',
//       },
//     });

//     return (response.data?.response?.results || []).map((item) => ({
//       title: item.fields?.headline || item.webTitle,
//       description:
//         item.fields?.trailText ||
//         item.fields?.standfirst ||
//         item.webTitle ||
//         '',
//       url: item.fields?.shortUrl || item.webUrl,
//       imageUrl: item.fields?.thumbnail || null,
//       source: 'The Guardian',
//       sourceLogo: 'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
//       publishedAt: item.webPublicationDate,
//       tags: (item.tags || []).map((t) => t.webTitle).slice(0, 3),
//       byline: item.fields?.byline || null,
//       section: item.fields?.sectionName || '',
//       provider: 'guardian',
//     }));
//   } catch (error) {
//     console.error(`Guardian fetch failed for "${topic}":`, error.message);
//     return [];
//   }
// }

// async function fetchFromNewsApi(topic) {
//   try {
//     const response = await newsApiClient.get('/everything', {
//       params: {
//         q: `"${topic}"`,
//         language: 'en',
//         sortBy: 'relevancy',
//         searchIn: 'title,description',
//         from: getDateDaysAgo(30),
//         to: getTodayDate(),
//         pageSize: 10,
//         apiKey: NEWS_API_KEY,
//       },
//     });

//     return (response.data?.articles || [])
//       .filter((a) => a.title && a.title !== '[Removed]')
//       .map((item) => {
//         let sourceLogo = null;
//         try {
//           sourceLogo = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.url).hostname}`;
//         } catch {
//           sourceLogo = null;
//         }
//         return {
//           title: item.title,
//           description: item.description || '',
//           url: item.url,
//           imageUrl: item.urlToImage || null,
//           source: item.source?.name || 'NewsAPI',
//           sourceLogo,
//           publishedAt: item.publishedAt,
//           tags: [],
//           byline: item.author || null,
//           section: '',
//           provider: 'newsapi',
//         };
//       });
//   } catch (error) {
//     console.error(`NewsAPI fetch failed for "${topic}":`, error.message);
//     return [];
//   }
// }

// function mergeAndDeduplicate(guardianArticles, newsApiArticles) {
//   const seen = new Set();
//   const result = [];

//   for (const article of guardianArticles) {
//     const key = article.url || article.title;
//     if (!seen.has(key)) {
//       seen.add(key);
//       result.push(article);
//     }
//   }

//   for (const article of newsApiArticles) {
//     const key = article.url || article.title;
//     const titleKey = article.title?.toLowerCase().slice(0, 60);
//     if (!seen.has(key) && !seen.has(titleKey)) {
//       seen.add(key);
//       seen.add(titleKey);
//       result.push(article);
//     }
//   }

//   return result;
// }

// // ─── Core fetch (no cache) ────────────────────────────────────────────────────

// async function fetchFreshNews(profession) {
//   const start = Date.now();

//   const topics = await generateNewsTopics(profession);

//   const fetchResults = await Promise.allSettled(
//     topics.flatMap((topic) => [
//       fetchFromGuardian(topic),
//       fetchFromNewsApi(topic),
//     ]),
//   );

//   const guardianArticles = [];
//   const newsApiArticles = [];

//   fetchResults.forEach((result, index) => {
//     if (result.status !== 'fulfilled') return;
//     if (index % 2 === 0) {
//       guardianArticles.push(...result.value);
//     } else {
//       newsApiArticles.push(...result.value);
//     }
//   });

//   const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles);
//   if (allArticles.length === 0) return [];

//   const articlesForGemini = allArticles.map((a) => ({
//     title: a.title,
//     description: a.description,
//   }));

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini);

//     const result = categorized.map(({ category, articles: geminiArticles }) => ({
//     sectionHeading: category,
//     content: geminiArticles
//       .filter(({ index: i }) => i >= 0 && i < allArticles.length)
//       .map(({ index: i, expandedSummary }) => {
//         const a = allArticles[i];
//         return {
//           newsDate: formatDate(a.publishedAt),
//           newsCategory: a.tags?.length ? a.tags : [category],
//           newsSource: a.source,
//           newsLogoUrl: a.sourceLogo,
//           newsImageUrl: a.imageUrl,
//           newsTitle: a.title,
//           // Gemini's expanded summary replaces the raw 1-2 sentence description
//           newsSummary: expandedSummary || a.description,
//           newsUrl: a.url,
//           newsByline: a.byline,
//         };
//       }),
//   }));
//   // Store in cache
//   const articleCount = result.reduce((sum, s) => sum + s.content.length, 0);
//   await setCache('news', profession, result, {
//     fetchDurationMs: Date.now() - start,
//     articleCount,
//   });

//   return result;
// }

// // ─── Main — cache aware ───────────────────────────────────────────────────────

// async function getPersonalizedNews(profession) {
//   // Try cache first
//   const cached = await getCache('news', profession);
//   if (cached) return cached;

//   // Cache miss — fetch fresh
//   return fetchFreshNews(profession);
// }

// // ─── Export fetchFreshNews for pre-population ─────────────────────────────────

// module.exports = { getPersonalizedNews, fetchFreshNews };

const axios = require('axios');
const { generateNewsTopics, filterAndCategorizeNews } = require('./geminiService');
const {
  getCache, setCache,
  getPersonalCache, setPersonalCache
} = require('./cacheService');

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

if (!GUARDIAN_API_KEY) throw new Error('GUARDIAN_API_KEY is not set');
if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY is not set');

const guardianClient = axios.create({
  baseURL: 'https://content.guardianapis.com',
  timeout: 60000,
});

const newsApiClient = axios.create({
  baseURL: 'https://newsapi.org/v2',
  timeout: 60000,
});

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

async function fetchFromGuardian(topic) {
  try {
    const response = await guardianClient.get('/search', {
      params: {
        q: topic,
        'api-key': GUARDIAN_API_KEY,
        'show-fields': 'headline,trailText,standfirst,thumbnail,shortUrl,byline,sectionName',
        'show-tags': 'keyword',
        'order-by': 'relevance',
        'from-date': getDateDaysAgo(30),
        'to-date': getTodayDate(),
        'page-size': 10,
        'use-date': 'published',
      },
    });
    return (response.data?.response?.results || []).map((item) => ({
      title: item.fields?.headline || item.webTitle,
      description: item.fields?.trailText || item.fields?.standfirst || item.webTitle || '',
      url: item.fields?.shortUrl || item.webUrl,
      imageUrl: item.fields?.thumbnail || null,
      source: 'The Guardian',
      sourceLogo: 'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
      publishedAt: item.webPublicationDate,
      tags: (item.tags || []).map((t) => t.webTitle).slice(0, 3),
      byline: item.fields?.byline || null,
      provider: 'guardian',
    }));
  } catch (error) {
    console.error(`Guardian fetch failed for "${topic}":`, error.message);
    return [];
  }
}
async function fetchFromNewsApi(topic) {
  try {
    const response = await newsApiClient.get('/everything', {
      params: {
        q: `"${topic}"`,
        language: 'en',
        sortBy: 'relevancy',
        searchIn: 'title,description',
        from: getDateDaysAgo(30),
        to: getTodayDate(),
        pageSize: 10,
        apiKey: NEWS_API_KEY,
      },
    });
    return (response.data?.articles || [])
      .filter((a) => a.title && a.title !== '[Removed]')
      .map((item) => {
        let sourceLogo = null;
        try {
          sourceLogo = `https://icons.duckduckgo.com/ip3/${new URL(item.url).hostname}.ico`;
        } catch { sourceLogo = null; }
        return {
          title: item.title,
          description: item.description || '',
          url: item.url,
          imageUrl: item.urlToImage || null,
          source: item.source?.name || 'NewsAPI',
          sourceLogo,
          publishedAt: item.publishedAt,
          tags: [],
          byline: item.author || null,
          provider: item.source.name,
        };
      });
  } catch (error) {
    console.error(`NewsAPI fetch failed for "${topic}":`, error.message);
    return [];
  }
}

function mergeAndDeduplicate(guardianArticles, newsApiArticles) {
  const seen = new Set();
  const result = [];
  for (const article of guardianArticles) {
    const key = article.url || article.title;
    if (!seen.has(key)) { seen.add(key); result.push(article); }
  }
  for (const article of newsApiArticles) {
    const key = article.url || article.title;
    const titleKey = article.title?.toLowerCase().slice(0, 60);
    if (!seen.has(key) && !seen.has(titleKey)) {
      seen.add(key); seen.add(titleKey); result.push(article);
    }
  }
  return result;
}

// ─── Shared fetch core ────────────────────────────────────────────────────────
// Used by both paths — takes a list of topics and fetches + categorizes
async function fetchAndCategorize(profession, topics, cvContext = null) {
  const fetchResults = await Promise.allSettled(
    topics.flatMap((topic) => [
      fetchFromGuardian(topic),
      fetchFromNewsApi(topic),
    ]),
  );

  const guardianArticles = [];
  const newsApiArticles = [];

  fetchResults.forEach((result, index) => {
    
    if (result.status !== 'fulfilled') return;
    if (index % 2 === 0) guardianArticles.push(...result.value);
    else newsApiArticles.push(...result.value);
  });
  console.log(guardianArticles);
  console.log(newsApiArticles);

  const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles);
  if (allArticles.length === 0) return { articles: [], categorized: [] };

  const articlesForGemini = allArticles.slice(0, 50).map((a) => ({
    title: a.title,
    description: a.description,
  }));

  // Pass CV context to Gemini for smarter categorization
  const categorized = await filterAndCategorizeNews(
    profession,
    articlesForGemini,
    cvContext,
  );

  return { articles: allArticles, categorized };
}
// async function fetchAndCategorize(profession, topics) {
//   const fetchResults = await Promise.allSettled(
//     topics.flatMap((topic) => [
//       fetchFromGuardian(topic),
//       fetchFromNewsApi(topic),
//     ]),
//   );

//   const guardianArticles = [];
//   const newsApiArticles = [];

//   fetchResults.forEach((result, index) => {
//     if (result.status !== 'fulfilled') return;
//     if (index % 2 === 0) guardianArticles.push(...result.value);
//     else newsApiArticles.push(...result.value);
//   });

//   const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles);
//   if (allArticles.length === 0) return { articles: [], categorized: [] };

//   // Cap at 50 articles for Gemini prompt
//   const articlesForGemini = allArticles.slice(0, 50).map((a) => ({
//     title: a.title,
//     description: a.description,
//   }));

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini);

//   return { articles: allArticles, categorized };
// }

function buildResult(articles, categorized) {
  return categorized.map(({ category, articles: geminiArticles }) => ({
    sectionHeading: category,
    content: geminiArticles
      .filter(({ index: i }) => i >= 0 && i < articles.length)
      .map(({ index: i, expandedSummary }) => {
        const a = articles[i];
        return {
          newsDate: formatDate(a.publishedAt),
          newsCategory: a.tags?.length ? a.tags : [category],
          newsSource: a.source,
          newsLogoUrl: a.sourceLogo,
          newsImageUrl: a.imageUrl,
          newsTitle: a.title,
          newsSummary: expandedSummary || a.description,
          newsUrl: a.url,
          newsByline: a.byline,
        };
      }),
  }));
}

// ─── Path 1: Profession-based (shared cache) ──────────────────────────────────
// Used by preloader + users without a CV profile.
// Gemini generates 5 topics from profession name only.

async function fetchFreshNews(profession) {
  const start = Date.now();

  const topics = await generateNewsTopics(profession);
  const { articles, categorized } = await fetchAndCategorize(profession, topics);
  if (articles.length === 0) return [];

  const result = buildResult(articles, categorized);
  const articleCount = result.reduce((sum, s) => sum + s.content.length, 0);

  // Save to shared profession cache
  await setCache('news', profession, result, {
    fetchDurationMs: Date.now() - start,
    articleCount,
  });

  return result;
}

// ─── Path 2: CV-based (personal cache) ───────────────────────────────────────
// Used by repersonalize only.
// Topics are the 10 rich topics already generated during CV analysis.
// No Gemini call needed to generate topics — they are passed in directly.
// filterAndCategorizeNews (one Gemini call) still runs to filter + expand summaries.

// async function fetchFreshNewsWithTopics(profession, topics, userId) {
//   const start = Date.now();

//   console.log(`[News] Fetching with ${topics.length} CV topics for user:${userId}`);

//   const { articles, categorized } = await fetchAndCategorize(profession, topics);
//   if (articles.length === 0) return [];

//   const result = buildResult(articles, categorized);
//   const articleCount = result.reduce((sum, s) => sum + s.content.length, 0);

//   // Save to personal user cache — does NOT touch shared profession cache
//   await setPersonalCache('news', userId, result, {
//     fetchDurationMs: Date.now() - start,
//     articleCount,
//   });

//   return result;
// }

// // ─── Main — two-tier cache lookup ─────────────────────────────────────────────

// async function getPersonalizedNews(profession, userId = null) {
//   console.log(`[NewsService] getPersonalizedNews called for user:${userId}, profession:${profession}`);
//   // 1. Personal cache first (only if user has a CV profile)
//   if (userId) {
//     const personal = await getPersonalCache('news', userId);
//     if (personal) return personal;
//   }

//   // 2. Shared profession cache
//   const shared = await getCache('news', profession);
//   if (shared) return shared;

//   // 3. Fresh fetch (profession-based, saves to shared cache)
//   return fetchFreshNews(profession);
// }
async function fetchFreshNewsWithTopics(profession, topics, userId) {
  const start = Date.now();
  console.log(`[News] Fetching with ${topics.length} CV topics for user:${userId}`);

  // Pass topics as CV context so Gemini knows the user's specific domains
  const cvContext = {
    topics,
    note: 'These topics are derived from the user\'s CV — prioritize articles matching these domains when categorizing',
  };

  const { articles, categorized } = await fetchAndCategorize(
    profession,
    topics,
    cvContext,
  );

  if (articles.length === 0) return [];

  const result = buildResult(articles, categorized);
  const articleCount = result.reduce((sum, s) => sum + s.content.length, 0);

  await setPersonalCache('news', userId, result, {
    fetchDurationMs: Date.now() - start,
    articleCount,
  });

  return result;
}
async function getPersonalizedNews(profession, userId = null) {
  console.log(`[NewsService] getPersonalizedNews called for user:${userId}, profession:${profession}`);
  // 1. Personal cache first (only if user has a CV profile)
  if (userId) {
    const personal = await getPersonalCache('news', userId);
    if (personal) return personal;
  }

  // 2. Shared profession cache
  const shared = await getCache('news', profession);
  if (shared) return shared;

  // 3. Fresh fetch (profession-based, saves to shared cache)
  return fetchFreshNews(profession);
}

module.exports = {
  getPersonalizedNews,
  fetchFreshNews,
  fetchFreshNewsWithTopics,
};