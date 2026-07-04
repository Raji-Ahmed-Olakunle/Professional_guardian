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
const { waitForNewsDataSlot } = require('./newsDataRateGate');
const axios = require('axios');
const { generateNewsTopics, filterAndCategorizeNews } = require('./geminiService');
const {
  getCache, setCache,
  getPersonalCache, setPersonalCache,isDbAvailable
} = require('./cacheService');
const { generateApiSpecificTopics } = require('./geminiTopicPrompts');
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

// ─── Guardian section whitelists per profession ───────────────────────────────
// Using inclusion (section=a,b,c) instead of exclusion (-a,-b,-c)
// because whitelisting is more precise — unknown future sections
// won't slip through, and irrelevant sections are blocked by default.

const GUARDIAN_SECTIONS = {
  'software engineer': [
    'technology',         // main tech coverage: AI, software, hardware
    'science',            // research, computing science, engineering
    'business',           // startup funding, big tech companies, M&A
    'media',              // digital media, platforms, streaming tech
    'money',              // fintech, crypto, digital payments
  ],

  nurse: [
    'society',            // NHS, social care, public health policy
    'science',            // medical research, clinical trials, drug approvals
    'world',              // global health outbreaks, WHO, pandemic coverage
    'politics',           // healthcare legislation, NHS funding, government policy
    'money',              // healthcare economics, care costs, insurance
  ],

  accountant: [
    'business',           // corporate finance, earnings, M&A, accounting fraud
    'money',              // personal finance, tax, savings, financial planning
    'politics',           // tax legislation, budget, fiscal policy, HMRC
    'technology',         // fintech, accounting software, digital tax
    'world',              // international tax, OECD, cross-border finance
  ],

  lawyer: [
    'law',                // dedicated law section: cases, rulings, legal analysis
    'politics',           // legislation, regulatory reform, government policy
    'business',           // corporate law, M&A, competition, fraud
    'technology',         // tech regulation, IP, data law, AI legislation
    'world',              // international law, human rights, cross-border cases
    'society',            // criminal justice, civil rights, social policy
  ],

  'electrical engineer': [
    'technology',         // semiconductors, EVs, hardware, AI chips
    'science',            // energy research, physics, engineering breakthroughs
    'business',           // energy companies, manufacturing, supply chain
    'environment',        // renewable energy, grid, climate tech, solar/wind
    'world',              // global energy policy, infrastructure, geopolitics
  ],
};

// ─── Fallback for unrecognised professions ────────────────────────────────────
const GUARDIAN_SECTIONS_DEFAULT = [
  'technology', 'science', 'business', 'society', 'world', 'politics',
];


function getGuardianSections(slug) {
  const sections = GUARDIAN_SECTIONS[slug] || GUARDIAN_SECTIONS_DEFAULT;
  return sections.join(',');
}

/**
 * Build a NewsAPI boolean query from a topic string.
 *
 * Strategy:
 * 1. Exact phrase match (highest precision) — must appear verbatim
 * 2. OR individual significant words (catches paraphrased headlines)
 * 3. NOT common noise terms that dilute results
 *
 * NewsAPI boolean syntax:
 *   "exact phrase"   — verbatim match
 *   +word            — word MUST appear
 *   -word            — word MUST NOT appear
 *   AND / OR / NOT   — logical operators (uppercase required)
 *   (a OR b) AND c   — grouping with parentheses
 */
/**
 * Build a NewsAPI boolean query from a topic string.
 *
 * Strategy:
 * 1. Exact phrase match (highest precision) — must appear verbatim
 * 2. OR individual significant words (catches paraphrased headlines)
 * 3. NOT common noise terms that dilute results
 *
 * NewsAPI boolean syntax:
 *   "exact phrase"   — verbatim match
 *   +word            — word MUST appear
 *   -word            — word MUST NOT appear
 *   AND / OR / NOT   — logical operators (uppercase required)
 *   (a OR b) AND c   — grouping with parentheses
 */
function buildNewsApiQuery(topic) {
  // Split topic into significant words (drop stopwords)
  const stopwords = new Set([
    'a','an','the','and','or','in','on','at','to','for',
    'of','with','by','from','is','are','was','were','be',
    'this','that','it','its','as','up',
  ]);

  const words = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  // Single-word topic — exact match is enough, add NOT noise
  if (words.length === 1) {
    return `"${topic}" NOT sports NOT celebrity NOT gossip`;
  }

  // Multi-word topic:
  // Exact phrase OR (all significant words present individually)
  const wordAnds = words.map((w) => `+${w}`).join(' ');

  return `("${topic}") OR (${wordAnds})`;
}
function buildGuardianQuery(topic) {
  const stopwords = new Set([
    'a','an','the','and','or','in','on','at','to','for',
    'of','with','by','from','is','are','was','were','be',
    'this','that','it','its','as','up',
  ]);

  const words = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  if (words.length === 0) return topic;
  if (words.length === 1) return words[0];


  const fullMatch    = words.join(' ');           // implicit AND — all words
  const partialMatch = words.join(' OR ');        // OR — any single word

  return `${fullMatch} OR ${partialMatch}`;
}
function buildSubsetQuery(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length === 1) return `"${phrase}"`;
  
  // Generate all 2-word subsets
  const subsets = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      subsets.push(`"${words[i]} ${words[j]}"`);
    }
  }
  return subsets.join(' OR ');
}
// ─── Exponential backoff helper ───────────────────────────────────────────────

async function withBackoff(fn, retries = 3, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;

      // 429 — rate limited, backoff and retry
      if (status === 429 && attempt < retries) {
        // Check for Retry-After header first
        const retryAfter = err.response?.headers?.['retry-after'];
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s

        console.warn(
          `[NewsAPI] 429 rate limited. Waiting ${waitMs}ms before retry ${attempt}/${retries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      // Non-429 or exhausted retries — throw
      throw err;
    }
  }
}

// ─── Updated fetchFromNewsApi with backoff ────────────────────────────────────

async function fetchFromNewsApi(topic, isCategory1 = false) {
  const query = `"${topic}"`;

  try {
    const data = await withBackoff(async () => {
      const response = await newsApiClient.get('/everything', {
        params: {
          q:          query,
          language:   'en',
          sortBy:     'relevancy',
          searchIn:   'title,description',
          from:       getDateDaysAgo(30),
          to:         getTodayDate(),
          pageSize:   isCategory1 ? 15 : 10,
          apiKey:     NEWS_API_KEY,
        },
      });

      return (response.data?.articles || [])
        .filter((a) => a.title && a.title !== '[Removed]')
        .map((item) => {
          let sourceLogo = null;
          try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch {}
          return {
            title:       item.title,
            description: item.description || '',
            url:         item.url,
            imageUrl:    item.urlToImage || null,
            source:      item.source?.name || 'NewsAPI',
            sourceLogo,
            publishedAt: item.publishedAt,
            tags:        [],
            byline:      item.author || null,
            provider:    item.source?.name || 'newsapi',
          };
        });
    });

    logApiResult(`NewsAPI[${isCategory1 ? 'cat1' : 'cat2'}]`, query, data);
    return data;
  } catch (err) {
    console.error(`[NewsAPI] failed for "${topic}":`, err.message);
    return [];   // never throw — degrade gracefully
  }
}

// ─── ENV validation ───────────────────────────────────────────────────────────

const GUARDIAN_API_KEY        = process.env.GUARDIAN_API_KEY;
const NEWS_API_KEY            = process.env.NEWS_API_KEY;
const COURTLISTENER_API_TOKEN = process.env.COURTLISTENER_API_TOKEN;
const FMP_API_KEY             = process.env.FMP_API_KEY;
const NEWSDATA_API_KEY        = process.env.NEWSDATA_API_KEY;

// Optional — services still work without these
const NCBI_API_KEY            = process.env.NCBI_API_KEY;           // PubMed: 3→10 req/s

if (!GUARDIAN_API_KEY)        throw new Error('GUARDIAN_API_KEY is not set');
if (!NEWS_API_KEY)            throw new Error('NEWS_API_KEY is not set');
if (!COURTLISTENER_API_TOKEN) throw new Error('COURTLISTENER_API_TOKEN is not set');
if (!FMP_API_KEY)             throw new Error('FMP_API_KEY is not set');
if (!NEWSDATA_API_KEY)        throw new Error('NEWSDATA_API_KEY is not set');

// ─── Profession detection ─────────────────────────────────────────────────────

/**
 * Maps any free-text profession string to one of 5 known slugs.
 * Returns null for unrecognised professions (falls back to Guardian + NewsAPI only).
 */
function detectProfession(profession) {
  if (!profession) return null;
  const lower = profession.toLowerCase().trim();
  if (lower.includes('software engineer') || lower.includes('software dev') ||
      lower.includes('frontend') || lower.includes('backend') ||
      lower.includes('fullstack') || lower.includes('full stack') ||
      lower.includes('web dev'))                   return 'software engineer';
  if (lower.includes('nurs'))                      return 'nurse';
  if (lower.includes('account') || lower.includes('auditor') ||
      lower.includes('bookkeep'))                  return 'accountant';
  if (lower.includes('lawyer') || lower.includes('attorney') ||
      lower.includes('solicitor') || lower.includes('barrister') ||
      lower.includes('legal'))                     return 'lawyer';
  if (lower.includes('electrical engineer') ||
      lower.includes('electronics engineer') ||
      lower.includes('power engineer') ||
      lower.includes('electronics'))               return 'electrical engineer';
  return null;
}

// ─── Dev.to hardcoded tags (software engineer only) ──────────────────────────

const DEVTO_TAGS = [
  'webdev', 'javascript', 'python',
  'devops', 'ai', 'cloud', 'backend', 'opensource',
];

// ─── HTTP clients ─────────────────────────────────────────────────────────────
function logApiResult(source, query, results) {
  console.log('='.repeat(60));
  console.log(`[${source}] SUCCESS`);
  console.log(`Query: ${query}`);
  console.log(`Results: ${results.length}`);

  if (results.length > 0) {
    console.log(`First Title: ${results[0].title}`);
  }

  console.log('='.repeat(60));
}
const guardianClient = axios.create({
  baseURL: 'https://content.guardianapis.com',
  timeout: 60000,
});

const newsApiClient = axios.create({
  baseURL: 'https://newsapi.org/v2',
  timeout: 60000,
});

const courtListenerClient = axios.create({
  baseURL: 'https://www.courtlistener.com/api/rest/v4',
  timeout: 60000,
  headers: { Authorization: `Token ${COURTLISTENER_API_TOKEN}` },
});

const fmpClient = axios.create({
  baseURL: 'https://financialmodelingprep.com',
  timeout: 60000,
});


// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function faviconFor(hostname) {
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL FETCHERS  (every profession)
// ═══════════════════════════════════════════════════════════════════════════════
const GUARDIAN_EXCLUDE_TAGS = {
  'software engineer':   'tone/news,tone/analysis,tone/features',
  nurse:                 'tone/news,tone/analysis,tone/features',
  accountant:            'tone/news,tone/analysis,tone/features',
  lawyer:                'tone/news,tone/analysis,tone/features',
  'electrical engineer': 'tone/news,tone/analysis,tone/features',
};
// async function fetchFromGuardian(topic,slug) {
//   const query = buildGuardianQuery(topic);
//   console.log(`[Guardian] query="${query}" topic="${topic}"`);
//   try {
    
//     const response = await guardianClient.get('/search', {
//       params: {
//         q: query,
//         'api-key': GUARDIAN_API_KEY,
//         'show-fields': 'headline,trailText,standfirst,thumbnail,shortUrl,byline,sectionName',
//         'show-tags': 'keyword',
//         'order-by': 'relevance',
//         'from-date': getDateDaysAgo(60),
//         'to-date': getTodayDate(),
//        // 'section':    getGuardianSections(slug),
//         'page-size': 20,
//         'use-date': 'published',
//        // 'q': `headline:(${topic}) OR body:(${topic})`,
//       },
//     });
    
//     const data=(response.data?.response?.results || []).map((item) => ({
//       title:       item.fields?.headline || item.webTitle,
//       description: item.fields?.trailText || item.fields?.standfirst || item.webTitle || '',
//       url:         item.fields?.shortUrl || item.webUrl,
//       imageUrl:    item.fields?.thumbnail || null,
      
//       source:      'The Guardian',
//       sourceLogo:  'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
//       publishedAt: item.webPublicationDate,
//       tags:        (item.tags || []).map((t) => t.webTitle).slice(0, 3),
//       byline:      item.fields?.byline || null,
//       provider:    'guardian',
//     }));
//       logApiResult('Guardian', topic, data);
//     return data;
//   } catch (err) {
//     console.error(`[Guardian] failed for "${topic}":`, err.message);
//     return [];
//   }
// }
async function fetchFromGuardian(topic, slug, isCategory1 = false) {
  const query = isCategory1
    ? topic                          // single word — plain search
    : buildSubsetQuery(topic);;     // phrase — subset OR logic

  console.log(`[Guardian][${isCategory1 ? 'cat1' : 'cat2'}] query="${query}"`);

  try {
    const response = await guardianClient.get('/search', {
      params: {
        q:            query,
        'api-key':    GUARDIAN_API_KEY,
        'show-fields':'headline,trailText,standfirst,thumbnail,shortUrl,byline,sectionName',
        'show-tags':  'keyword',
        'order-by':   'relevance',
        'from-date':  getDateDaysAgo(30),
        'to-date':    getTodayDate(),
        'tag':        'tone/news',
        // Category1 returns more results — higher page size
        'page-size':  isCategory1 ? 50 : 20,
        'use-date':   'published',
      },
    });

    const data = (response.data?.response?.results || []).map((item) => ({
      title:       item.fields?.headline || item.webTitle,
      description: item.fields?.trailText || item.fields?.standfirst || item.webTitle || '',
      url:         item.fields?.shortUrl || item.webUrl,
      imageUrl:    item.fields?.thumbnail || null,
      source:      'The Guardian',
      sourceLogo:  'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png',
      publishedAt: item.webPublicationDate,
      tags:        (item.tags || []).map((t) => t.webTitle).slice(0, 3),
      byline:      item.fields?.byline || null,
      provider:    'guardian',
    }));

    logApiResult(`Guardian[${isCategory1 ? 'cat1' : 'cat2'}]`, query, data);
    return data;
  } catch (err) {
    console.error(`[Guardian] failed for "${topic}":`, err.message);
    return [];
  }
}

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
//         pageSize: 12,
//         apiKey: NEWS_API_KEY,
//       },
//     });
//     const data = (response.data?.articles || [])
//       .filter((a) => a.title && a.title !== '[Removed]')
//       .map((item) => {
//         let sourceLogo = null;
//         try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch { /* noop */ }
//         return {
//           title:       item.title,
//           description: item.description || '',
//           url:         item.url,
//           imageUrl:    item.urlToImage || null,
//           source:      item.source?.name || 'NewsAPI',
//           sourceLogo,
//           publishedAt: item.publishedAt,
//           tags:        [],
//           byline:      item.author || null,
//           provider:    item.source?.name || 'newsapi',
//         };
//       });
//       logApiResult('NewsAPI', topic, data);
//     return data;
//   } catch (err) {
//     console.error(`[NewsAPI] failed for "${topic}":`, err.message);
//     return [];
//   }
// }
// async function fetchFromNewsApi(topic, isCategory1 = false) {
//   const query = isCategory1
//     ? `"${topic}"`                   // single word exact
//     : `"${topic}"`;                  // phrase exact — subsets handled at call site

//   try {
//     const response = await newsApiClient.get('/everything', {
//       params: {
//         q:          query,
//         language:   'en',
//         sortBy:     'relevancy',
//         searchIn:   'title,description',
//         from:       getDateDaysAgo(30),
//         to:         getTodayDate(),
//         // Category1 returns more results — higher page size
//         pageSize:   isCategory1 ? 15 : 10,
//         apiKey:     NEWS_API_KEY,
//       },
//     });

//     const data = (response.data?.articles || [])
//       .filter((a) => a.title && a.title !== '[Removed]')
//       .map((item) => {
//         let sourceLogo = null;
//         try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch {}
//         return {
//           title:       item.title,
//           description: item.description || '',
//           url:         item.url,
//           imageUrl:    item.urlToImage || null,
//           source:      item.source?.name || 'NewsAPI',
//           sourceLogo,
//           publishedAt: item.publishedAt,
//           tags:        [],
//           byline:      item.author || null,
//           provider:    item.source?.name || 'newsapi',
//         };
//       });

//     logApiResult(`NewsAPI[${isCategory1 ? 'cat1' : 'cat2'}]`, query, data);
//     return data;
//   } catch (err) {
//     console.error(`[NewsAPI] failed for "${topic}":`, err.message);
//     return [];
//   }
// }
// ─── Build single combined NewsAPI query from both categories ─────────────────

function buildCombinedNewsApiQuery(category1Words, category2Phrases) {
  // Category1: each word as exact quoted term joined by OR
  const cat1Query = category1Words
    .map((w) => `"${w}"`)
    .join(' OR ');

  // Category2: each phrase as exact quoted term joined by OR
  // Also add all 2-word subsets for each phrase
  const cat2Parts = [];
  for (const phrase of category2Phrases) {
    const words = phrase.split(/\s+/).filter(Boolean);
    // Full phrase
    cat2Parts.push(`"${phrase}"`);
    // All 2-word subsets
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        cat2Parts.push(`"${words[i]} ${words[j]}"`);
      }
    }
  }
  const cat2Query = [...new Set(cat2Parts)].join(' OR '); // dedupe subsets

  return `(${cat1Query}) OR (${cat2Query})`;
}

// ─── Single NewsAPI fetch — one call covers all categories ────────────────────

async function fetchFromNewsApi(topics) {
  const query = buildCombinedNewsApiQuery(
    topics.newsApi.category1,
    topics.newsApi.category2,
  );

  console.log(`[NewsAPI] combined query="${query}"`);

  try {
    const data = await withBackoff(async () => {
      const response = await newsApiClient.get('/everything', {
        params: {
          q:          query,
          language:   'en',
          sortBy:     'relevancy',
          searchIn:   'title,description',
          from:       getDateDaysAgo(30),
          to:         getTodayDate(),
          pageSize:   100, // max allowed — get as much as possible in one call
          apiKey:     NEWS_API_KEY,
        },
      });

      return (response.data?.articles || [])
        .filter((a) => a.title && a.title !== '[Removed]')
        .map((item) => {
          let sourceLogo = null;
          try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch {}
          return {
            title:       item.title,
            description: item.description || '',
            url:         item.url,
            imageUrl:    item.urlToImage || null,
            source:      item.source?.name || 'NewsAPI',
            sourceLogo,
            publishedAt: item.publishedAt,
            tags:        [],
            byline:      item.author || null,
            provider:    item.source?.name || 'newsapi',
          };
        });
    });

    logApiResult('NewsAPI[combined]', query, data);
    return data;
  } catch (err) {
    console.error(`[NewsAPI] failed:`, err.message);
    console.log(err.response?.data);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOFTWARE ENGINEER — Dev.to + Hacker News (Algolia)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFromDevTo(tags) {
  // Run all tag fetches in parallel — each has its own try/catch so one
  // failing tag never silences the rest
  const settled = await Promise.allSettled(
    //DEVTO_TAGS.map((tag) =>
      tags.map((tag)=>
      axios.get('https://dev.to/api/articles', {
        params: { tag, per_page: 5, top: 7 },
        timeout: 15000,
      })
    )
  );
 
  const results = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[Dev.to] failed for tag "${DEVTO_TAGS[i]}":`, result.reason?.message);
      return;
    }
    for (const item of result.value.data || []) {
      results.push({
        title:       item.title,
        description: item.description || item.tag_list?.join(', ') || '',
        url:         item.url,
        imageUrl:    item.cover_image || item.social_image || null,
        source:      'Dev.to',
        sourceLogo:  faviconFor('dev.to'),
        publishedAt: item.published_at,
        tags:        item.tag_list || [],
        byline:      item.user?.name || null,
        provider:    'devto',
      });
    }
  });
  logApiResult('Dev.to', DEVTO_TAGS.join(', '), results);
 
  return results;
}
/**
 * hnQueries are generated by Gemini inside generateNewsTopics()
 * when profession is software engineer (single combined call — no extra cost).
 */
// async function fetchFromHackerNews(hnQueries) {
//   const results = [];
//   for (const query of hnQueries) {
//     try {
//       const response = await axios.get('https://hn.algolia.com/api/v1/search', {
//         params: {
//           query,
//           tags: 'story',
//           hitsPerPage: 8,
//           numericFilters: `created_at_i>${Math.floor(Date.now() / 1000) - 30 * 86400}`,
//         },
//         timeout: 15000,
//       });
//       results.push(...(response.data?.hits || [])
//         .filter((h) => h.title && h.url)
//         .map((item) => {
//           let sourceLogo = null;
//           try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch { /* noop */ }
//           return {
//             title:       item.title,
//             description: item.story_text
//               ? item.story_text.replace(/<[^>]+>/g, '').slice(0, 200)
//               : '',
//             url:         item.url,
//             imageUrl:    null,
//             source:      'Hacker News',
//             sourceLogo:  faviconFor('news.ycombinator.com'),
//             publishedAt: item.created_at,
//             tags:        [],
//             byline:      item.author || null,
//             provider:    'hackernews',
//           };
//         }));
//     } catch (err) {
//       console.error(`[HackerNews] failed for "${query}":`, err.message);
//     }
//   }
//   logApiResult('HackerNews', hnQueries.join(', '), results);
//   return results;
// }


// AFTER — all queries fire together, Algolia has no meaningful rate concern:
async function fetchFromHackerNews(hnQueries) {
  const settled = await Promise.allSettled(
    hnQueries.map((query) =>
      axios.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query,
          tags: 'story',
          hitsPerPage: 8,
          numericFilters: `created_at_i>${Math.floor(Date.now() / 1000) - 30 * 86400}`,
        },
        timeout: 15000,
      }),
    ),
  );

  const results = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[HackerNews] failed for "${hnQueries[i]}":`, result.reason?.message);
      return;
    }
    results.push(
      ...(result.value.data?.hits || [])
        .filter((h) => h.title && h.url)
        .map((item) => {
          let sourceLogo = null;
          try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch { /* noop */ }
          return {
            title:       item.title,
            description: item.story_text
              ? item.story_text.replace(/<[^>]+>/g, '').slice(0, 200)
              : '',
            url:         item.url,
            imageUrl:    null,
            source:      'Hacker News',
            sourceLogo:  faviconFor('news.ycombinator.com'),
            publishedAt: item.created_at,
            tags:        [],
            byline:      item.author || null,
            provider:    'hackernews',
          };
        }),
    );
  });
  logApiResult('HackerNews', hnQueries.join(', '), results);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAWYER — CourtListener + Federal Register
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CourtListener — precedential court opinions, US federal + state.
 * Token required (free account at courtlistener.com).
 */
async function fetchFromCourtListener(topic) {
  try {
    const response = await courtListenerClient.get('/search/', {
      params: {
        q: topic,
        type: 'o',                        // opinions
        order_by: 'score desc',
        filed_after: getDateDaysAgo(90),  // opinions publish slower than news
        filed_before: getTodayDate(),
        stat_Precedential: 'on',
        format: 'json',
      },
    });
   
    const data=(response.data?.results || []).slice(0, 8).map((item) => ({
      title:       item.caseName || item.case_name || 'Court Opinion',
      description: item.snippet || item.syllabus || item.summary || '',
      url:         item.absolute_url
        ? `https://www.courtlistener.com${item.absolute_url}`
        : item.download_url || '',
      imageUrl:    null,
      source:      'CourtListener',
      sourceLogo:  faviconFor('courtlistener.com'),
      publishedAt: item.dateFiled || item.date_filed || null,
      tags:        [item.court || 'Federal Court'].filter(Boolean),
      byline:      item.judge || null,
      provider:    'courtlistener',
    }));
     logApiResult('CourtListener', topic, data);
    return data;
  } catch (err) {
    console.error(`[CourtListener] failed for "${topic}":`, err.message);
    return [];
  }
}

/**
 * Federal Register — rules, proposed rules, notices from 400+ US agencies.
 * No API key required. Covers SEC, IRS, FTC, FDA and more — relevant to
 * both lawyers (regulation) and accountants (tax/SEC notices).
 */

async function fetchFromFederalRegister(topic) {
  try {
    // Axios does not correctly serialize repeated bracket-notation keys or
    // array params for this API — build the query string manually instead.
    const fields = ['title', 'abstract', 'html_url', 'publication_date', 'agency_names', 'excerpts'].join('&fields[]=');
    const qs = [
      `conditions[term]=${encodeURIComponent(topic)}`,
      `conditions[type][]=RULE`,
      `conditions[type][]=PRORULE`,
      `conditions[type][]=NOTICE`,
      `conditions[publication_date][gte]=${getDateDaysAgo(60)}`,
      `per_page=8`,
      `order=relevance`,
      `fields[]=${fields}`,
    ].join('&');

    const response = await axios.get(
      `https://www.federalregister.gov/api/v1/documents.json?${qs}`,
      { timeout: 20000 },
    );

    
    const data=(response.data?.results || []).map((item) => ({
      title:       item.title,
      description: item.abstract || item.excerpts || '',
      url:         item.html_url,
      imageUrl:    null,
      source:      (item.agency_names || ['Federal Register'])[0],
      sourceLogo:  faviconFor('federalregister.gov'),
      publishedAt: item.publication_date || null,
      tags:        item.agency_names?.slice(0, 3) || [],
      byline:      null,
      provider:    'federalregister',
    }));
    logApiResult('FederalRegister', topic, data);
    return data;
  } catch (err) {
    console.error(`[FederalRegister] failed for "${topic}":`, err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NURSE — WHO News + CDC Content Syndication
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WHO News API — official global health news articles from WHO.
 * No key required. Returns actual news items with title, summary, URL.
 */
/**
 * WHO Newsroom Articles API.
 * Correct endpoint: /api/newsroom/articles (not /api/news/newsitems)
 * Returns a flat JSON array — no OData envelope.
 * No key required.
 */

async function fetchFromWHO() {
  // Try the current WHO newsroom endpoint first, fall back to the RSS-based one
  const endpoints = [
    // Current endpoint (JSON API)
    {
      url:    'https://www.who.int/api/newsroom/articles',
      params: { sf_culture: 'en', pageSize: 20 }, // no OData params — stripped
    },
    // Fallback: WHO news feed via public RSS→JSON proxy
    {
      url:    'https://www.who.int/rss-feeds/news-english.xml',
      params: {},
      isRss:  true,
    },
  ];
 
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, {
        params:  endpoint.params,
        timeout: 20000,
        headers: { Accept: 'application/json' },
      });
 
      // Handle the multiple shapes WHO has used over time
      const data  = response.data;
      const items =
        Array.isArray(data)               ? data               :  // plain array
        Array.isArray(data?.value)        ? data.value         :  // OData envelope
        Array.isArray(data?.data)         ? data.data          :  // { data: [...] }
        Array.isArray(data?.results)      ? data.results       :  // { results: [...] }
        Array.isArray(data?.articles)     ? data.articles      :  // { articles: [...] }
        [];
 
      if (items.length === 0) {
        console.warn(`[WHO] No items from ${endpoint.url}. Keys:`, Object.keys(data || {}));
        continue; // try next endpoint
      }
 
     
      const newdata= items.slice(0, 15).map((item) => ({
        title:       item.Title       || item.title       || '',
        description: item.Summary     || item.summary     ||
                     item.MetaDescription || item.description || '',
        url:         item.ItemDefaultUrl
          ? `https://www.who.int${item.ItemDefaultUrl}`
          : item.url || item.Url || 'https://www.who.int/news',
        imageUrl:    null,
        source:      'WHO',
        sourceLogo:  faviconFor('who.int'),
        publishedAt: item.PublicationDate || item.PublicationDateAndTime ||
                     item.publishedAt    || null,
        tags:        ['Public Health', 'WHO'],
        byline:      null,
        provider:    'who',
      })).filter((a) => a.title && a.url)
.filter((a) => {
  if (!a.publishedAt) return true; // keep if no date (can't judge)
  return new Date(a.publishedAt) >= new Date(getDateDaysAgo(180)); // WHO publishes slowly
})
        logApiResult('WHO', endpoint.url, newdata);
  return newdata;
    } catch (err) {
      console.error(`[WHO] failed for ${endpoint.url}:`, err.message);
      // continue to next endpoint
    }
  }
 
  // Both endpoints failed
  console.error('[WHO] All endpoints failed — returning []');
  return [];
}

/**
 * CDC Content Syndication API — public health alerts, outbreak news,
 * emergency preparedness, flu updates. No key required.
 *
 * Correct param: topic (string, one at a time) not tags (comma list).
 * We make two calls — outbreaks + emergency preparedness — and merge.
 */

async function fetchFromCDC() {
  const cdcTopics = ['Outbreaks', 'Emergency Preparedness'];
  const results   = [];
 const datePublishStart = getDateDaysAgo(90);  // reuse your existing helper
  const datePublishEnd   = getTodayDate();
  for (const topic of cdcTopics) {
    try {
      const response = await axios.get('https://tools.cdc.gov/api/v2/resources/media', {
        params: {
          topic,
          mediatype: 'html',
          sort:      'datePublished',
          order:     'desc',
          max:       12,
          offset:    0,
          datePublishStart, 
          datePublishEnd,
          
        },
        timeout: 20000,
      });
 
      // CDC v2 shape:  { results: { items: [...], total: N, ... } }
      // (NOT results as a flat array)
      const raw   = response.data;
      const items =
        Array.isArray(raw)                          ? raw              :  // just in case
        Array.isArray(raw?.results?.items)          ? raw.results.items :  // correct v2 shape
        Array.isArray(raw?.results)                 ? raw.results      :  // older shape
        [];
 
      if (items.length === 0) {
        console.warn(`[CDC] No items found for topic "${topic}". Raw keys:`, Object.keys(raw?.results || raw || {}));
      }
 
      results.push(
        ...items.slice(0, 10).map((item) => ({
          title:       item.name || item.title || '',
          description: item.description || item.text || '',
          url:         item.targetUrl || item.sourceUrl || 'https://www.cdc.gov',
          imageUrl:    null,
          source:      'CDC',
          sourceLogo:  faviconFor('cdc.gov'),
          publishedAt: item.datePublished || item.dateSyndicationUpdated || null,
          tags:        Array.isArray(item.tags)
            ? item.tags.map((t) => t.name || t).slice(0, 3)
            : ['Public Health'],
          byline:      null,
          provider:    'cdc',
        })).filter((a) => a.title)
      );

    } catch (err) {
      console.error(`[CDC] failed for topic "${topic}":`, err.message);
    }
  }
 logApiResult('CDC', cdcTopics.join(', '), results);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTANT — FMP + Federal Register
// ═══════════════════════════════════════════════════════════════════════════════
const FMP_ACCOUNTING_TICKERS = [
  'JPM', 'GS', 'MS', 'BAC',   // major banks — financial reporting news
  'BRK.B',                     // Berkshire — broad financial/accounting coverage
  'MSFT', 'AAPL',              // often involve big audit/earnings coverage
].join(',');
 
// async function fetchFromFMP(topic) {
//   try {
//     const response = await fmpClient.get('/v3/stock_news', {
//       params: {
//         tickers: FMP_ACCOUNTING_TICKERS,
//         limit:   30,
//         apikey:  FMP_API_KEY,
//       },
//       timeout: 20000,
//     });
 
//     const lowerTopic = topic.toLowerCase();
//     const articles   = Array.isArray(response.data) ? response.data : [];
 
    
//     const data=articles
//       .filter((item) => {
//         // Only keep articles whose title/text mentions the topic
//         const text = `${item.title || ''} ${item.text || ''}`.toLowerCase();
//         return text.includes(lowerTopic);
//       })
//       .slice(0, 8)
//       .map((item) => {
//         let sourceLogo = null;
//         try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch { /* noop */ }
//         return {
//           title:       item.title,
//           description: (item.text || '').slice(0, 250),
//           url:         item.url,
//           imageUrl:    item.image || null,
//           source:      item.site || 'Financial Modeling Prep',
//           sourceLogo,
//           publishedAt: item.publishedDate || null,
//           tags:        [],
//           byline:      null,
//           provider:    'fmp',
//         };
//       })
//       .filter((a) => a.title && a.url);
//       logApiResult('FMP', topic, data);
//       return data;
//   } catch (err) {
//     console.error({
//       status:  err.response?.status,
//       data:    err.response?.data,
//       url:     err.config?.url,
//       params:  err.config?.params,
//       message: err.message,
//     });
//     console.error(`[FMP] failed for "${topic}":`, err.message);
//     return [];
//   }
// }
async function fetchFromFMP(keywords) {   // keywords = string[] from topics.fmp
  try {
    const response = await fmpClient.get('/v3/stock_news', {
      params: { tickers: FMP_ACCOUNTING_TICKERS, limit: 50, apikey: FMP_API_KEY },
    });

    const articles = Array.isArray(response.data) ? response.data : [];
    const lowerKws = keywords.map(k => k.toLowerCase());

    const data = articles
      .filter(item => {
        const text = `${item.title || ''} ${item.text || ''}`.toLowerCase();
        return lowerKws.some(kw => text.includes(kw));   // OR: any keyword matches
      })
      .slice(0, 15)
      .map(item => {
        let sourceLogo = null;
        try { sourceLogo = faviconFor(new URL(item.url).hostname); } catch {}
        return {
          title:       item.title,
          description: (item.text || '').slice(0, 250),
          url:         item.url,
          imageUrl:    item.image || null,
          source:      item.site || 'Financial Modeling Prep',
          sourceLogo,
          publishedAt: item.publishedDate || null,
          tags:        [],
          byline:      null,
          provider:    'fmp',
        };
      })
      .filter(a => a.title && a.url);

    logApiResult('FMP', keywords.join(', '), data);
    return data;
  } catch (err) {
    console.error('[FMP] failed:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELECTRICAL ENGINEER — NewsData.io
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * NewsData.io — engineering / science / technology news.
 * Free tier: /latest endpoint only (200 credits/day).
 * - timeframe must be a STRING e.g. "48" not integer 48
 * - category CANNOT be combined with timeframe on free plan — omit it
 * - size/from_date are not valid params on /latest — omit them
 * Gemini handles relevance filtering downstream anyway.
 */

async function fetchFromNewsData(topic) {
  await waitForNewsDataSlot();
  try {
    const response = await axios.get('https://newsdata.io/api/1/latest', {
      params: {
        apikey:   NEWSDATA_API_KEY,
        q:        topic,
        language: 'en',
        category: 'technology,science', // free plan supports category without timeframe
      },
      timeout: 20000,
    });
 
   
    const data=(response.data?.results || [])
      .filter((item) => item.title && item.link)
      .map((item) => {
        let sourceLogo = null;
        try { sourceLogo = faviconFor(new URL(item.link).hostname); } catch { /* noop */ }
        return {
          title:       item.title,
          description: item.description || item.content?.slice(0, 250) || '',
          url:         item.link,
          imageUrl:    item.image_url || null,
          source:      item.source_name || item.source_id || 'NewsData',
          sourceLogo,
          publishedAt: item.pubDate || null,
          tags:        item.keywords?.slice(0, 3) || (Array.isArray(item.category) ? item.category : []),
          byline:      item.creator?.[0] || null,
          provider:    'newsdata',
        };
      });
      logApiResult('NewsData.io', topic, data);
       return data;
  } catch (err) {
    console.error({
      status:  err.response?.status,
      data:    err.response?.data,
      url:     err.config?.url,
      params:  err.config?.params,
      message: err.message,
    });
    console.error(`[NewsData] failed for "${topic}":`, err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

function mergeAndDeduplicate(...articleArrays) {
  const seenUrls   = new Set();
  const seenTitles = new Set(); // symmetric — same check for every source
  const result     = [];
 
  for (const articles of articleArrays) {
    for (const article of articles) {
      const urlKey   = article.url?.trim();
      const titleKey = article.title?.toLowerCase().slice(0, 60);
 
      // Skip if we have nothing to key on
      if (!urlKey && !titleKey) continue;
 
      // Duplicate check — same logic regardless of source
      const isDupUrl   = urlKey   && seenUrls.has(urlKey);
      const isDupTitle = titleKey && seenTitles.has(titleKey);
 
      if (isDupUrl || isDupTitle) continue;
 
      // Accept the article and register both keys
      if (urlKey)   seenUrls.add(urlKey);
      if (titleKey) seenTitles.add(titleKey);
 
      result.push(article);
    }
  }
 
  return result;
}


// async function fetchAndCategorize(profession, topics, cvContext = null, hnQueries = null) {
//   // const slug = detectProfession(profession);

//   // // ── 1. Universal fetches ───────────────────────────────────────────────────
//   // const universalFetches = topics.flatMap((topic) => [
//   //   fetchFromGuardian(topic),
//   //   fetchFromNewsApi(topic),
//   // ]);

//   // // ── 2. Profession-specific fetches ─────────────────────────────────────────
//   // const specificFetches = [];

//   // if (slug === 'software engineer') {
//   //   specificFetches.push(fetchFromDevTo());
//   //   if (hnQueries?.length) specificFetches.push(fetchFromHackerNews(hnQueries));
//   // }

//   // if (slug === 'lawyer') {
//   //   // CourtListener per topic (max 3 to stay within rate budget)
//   //   topics.slice(0, 3).forEach((topic) => {
//   //     specificFetches.push(fetchFromCourtListener(topic));
//   //   });
//   //   // Federal Register per topic (max 3)
//   //   topics.slice(0, 3).forEach((topic) => {
//   //     specificFetches.push(fetchFromFederalRegister(topic));
//   //   });
//   // }

//   // if (slug === 'nurse') {
//   //   // WHO — single call, returns latest global health news
//   //   specificFetches.push(fetchFromWHO());
//   //   // CDC — single call, returns public health alerts
//   //   specificFetches.push(fetchFromCDC());
//   // }

//   // if (slug === 'accountant') {
//   //   // FMP per topic (max 3 to stay within 250 req/day)
//   //   topics.slice(0, 3).forEach((topic) => {
//   //     specificFetches.push(fetchFromFMP(topic));
//   //   });
//   //   // Federal Register per topic — covers SEC/IRS/tax regulation notices
//   //   topics.slice(0, 3).forEach((topic) => {
//   //     specificFetches.push(fetchFromFederalRegister(topic));
//   //   });
//   // }

//   // if (slug === 'electrical engineer') {
//   //   // NewsData per topic (max 3 to stay within 200 credits/day)
//   //   topics.slice(0, 3).forEach((topic) => {
//   //     specificFetches.push(fetchFromNewsData(topic));
//   //   });
//   // }

//   // // ── 3. Run all in parallel ──────────────────────────────────────────────────
//   // const allFetches = [...universalFetches, ...specificFetches];
//   // const settled    = await Promise.allSettled(allFetches);
//   const slug = detectProfession(profession);

//   // Guardian and NewsAPI now have separate, tuned query lists
//   // const universalFetches = [
//   //   ...topics.guardian.map(fetchFromGuardian),
//   //   ...topics.newsApi.map(fetchFromNewsApi),
//   // ];
// const universalFetches = [
//   // Guardian category1 — one combined OR query for all 5 single words
//   fetchFromGuardian(
//     topics.guardian.category1.join(' OR '),
//     slug,
//     true,   // isCategory1
//   ),
//   // Guardian category2 — one call per phrase with subset OR logic
//   ...topics.guardian.category2.map((phrase) =>
//     fetchFromGuardian(phrase, slug, false)
//   ),

//   // NewsAPI category1 — one combined OR query for all 5 single words
//   fetchFromNewsApi(
//     topics.newsApi.category1.join(' OR '),
//     true,   // isCategory1
//   ),
//   // NewsAPI category2 — one call per phrase (exact quoted phrase)
//   ...topics.newsApi.category2.map((phrase) =>
//     fetchFromNewsApi(phrase, false)
//   ),
// ];

//   const specificFetches = [];

//   if (slug === 'software engineer') {
//     // Dev.to: tags come from Gemini now, not the hardcoded DEVTO_TAGS constant
//     if (topics.devTo?.length)      specificFetches.push(fetchFromDevTo(topics.devTo));
//     if (topics.hackerNews?.length) specificFetches.push(fetchFromHackerNews(topics.hackerNews));
//   }

//   if (slug === 'lawyer') {
//     topics.courtListener?.forEach(q  => specificFetches.push(fetchFromCourtListener(q)));
//     topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
//   }

//   if (slug === 'nurse') {
//     specificFetches.push(fetchFromWHO());   // no topics needed
//     specificFetches.push(fetchFromCDC());   // no topics needed
//   }

//   if (slug === 'accountant') {
//     specificFetches.push(fetchFromFMP(topics.fmp || []));        // single call, keyword filter
//     topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
//   }

//   if (slug === 'electrical engineer') {
//     topics.newsData?.forEach(q => specificFetches.push(fetchFromNewsData(q)));
//   }

//   const allFetches = [...universalFetches, ...specificFetches];
//   const settled    = await Promise.allSettled(allFetches);

//   const universalCount   = universalFetches.length;
//   const guardianArticles = [];
//   const newsApiArticles  = [];
//   const specificArticles = [];

//   settled.forEach((result, index) => {
//     if (result.status !== 'fulfilled') return;
//     if (index < universalCount) {
//       if (index % 2 === 0) guardianArticles.push(...result.value);
//       else                  newsApiArticles.push(...result.value);
//     } else {
//       specificArticles.push(...result.value);
//     }
//   });


//   const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles, specificArticles);

//   if (allArticles.length === 0) return { articles: [], categorized: [] };

//   const articlesForGemini = allArticles.slice(0, 90).map((a, i) => ({
//     index: i,
//     title:       a.title,
//     description: a.description,
//   }));
//     console.log('\n========== FETCH SUMMARY ==========');

// console.log('Guardian:', guardianArticles.length);
// console.log('NewsAPI:', newsApiArticles.length);
// console.log('Specific:', specificArticles.length);
// console.log('After Dedup:', allArticles.length);

// console.log('===================================\n');

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini, cvContext);
// console.log('\n========== GEMINI ==========');
// console.log('Articles Sent:', articlesForGemini.length);
// console.log('Categories Returned:', categorized.length);

// categorized.forEach(c => {
//   console.log(
//     `${c.category}: ${c.articles.length} articles`
//   );
// });

// console.log('============================\n');
//   return { articles: allArticles, categorized };
// }
// ─── Sequential NewsAPI fetcher with delay ────────────────────────────────────
// NewsAPI free tier: 1 req/sec. Run sequentially with 1.1s gap.

// async function fetchNewsApiSequential(calls) {
//   const results = [];
//   for (const call of calls) {
//     results.push(await call());
//     // Small delay between calls to stay under rate limit
//     await new Promise((resolve) => setTimeout(resolve, 5100));
//   }
//   return results;
// }

// ─── Updated universalFetches in fetchAndCategorize ──────────────────────────
async function fetchAndCategorize(profession, topics, cvContext = null) {
  const slug = detectProfession(profession);

  // ── Build every independent fetch as a promise WITHOUT awaiting any of them ──
  const guardianFetches = [
    fetchFromGuardian(topics.guardian.category1.join(' OR '), slug, true),
    ...topics.guardian.category2.map((phrase) => fetchFromGuardian(phrase, slug, false)),
  ];
  const guardianPromise = Promise.allSettled(guardianFetches);
  const newsApiPromise  = fetchFromNewsApi(topics);

  const specificFetches = [];
  if (slug === 'software engineer') {
    if (topics.devTo?.length)      specificFetches.push(fetchFromDevTo(topics.devTo));
    if (topics.hackerNews?.length) specificFetches.push(fetchFromHackerNews(topics.hackerNews));
  }
  if (slug === 'lawyer') {
    topics.courtListener?.forEach(q  => specificFetches.push(fetchFromCourtListener(q)));
    topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
  }
  if (slug === 'nurse') {
    specificFetches.push(fetchFromWHO());
    specificFetches.push(fetchFromCDC());
  }
  if (slug === 'accountant') {
    specificFetches.push(fetchFromFMP(topics.fmp || []));
    topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
  }
  const specificPromise = Promise.allSettled(specificFetches);

  // NewsData.io still has to stay internally sequential (30-credit/15-min
  // ceiling), but that sequential CHAIN can run in parallel with everything
  // else — it doesn't need to block or be blocked by Guardian/NewsAPI/etc.
  let newsDataPromise = Promise.resolve([]);
  if (slug === 'electrical engineer' && topics.newsData?.length) {
    newsDataPromise = (async () => {
      const collected = [];
      for (const q of topics.newsData) {
        collected.push(...(await fetchFromNewsData(q))); // gated internally
      }
      return collected;
    })();
  }

  // ── Fire ALL of the above at once ──────────────────────────────────────────
  const [guardianSettled, newsApiArticles, specificSettled, newsDataArticles] =
    await Promise.all([guardianPromise, newsApiPromise, specificPromise, newsDataPromise]);

  const guardianArticles = guardianSettled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const specificArticles = specificSettled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const allArticles = mergeAndDeduplicate(
    guardianArticles, newsApiArticles, specificArticles, newsDataArticles,
  );

  if (allArticles.length === 0) return { articles: [], categorized: [] };

  const articlesForGemini = allArticles.slice(0, 200).map((a, i) => ({
    index:       i,
    title:       a.title,
    description: a.description?.trim() || '[no description]',
  }));

  console.log('\n========== FETCH SUMMARY ==========');
  console.log('Guardian:', guardianArticles.length);
  console.log('NewsAPI:', newsApiArticles.length);
  console.log('Specific:', specificArticles.length);
  console.log('NewsData:', newsDataArticles.length);
  console.log('After Dedup:', allArticles.length);
  console.log('===================================\n');

  const categorized = await filterAndCategorizeNews(profession, articlesForGemini, cvContext);
  return { articles: allArticles, categorized };
}
// async function fetchAndCategorize(profession, topics, cvContext = null) {
//   const slug = detectProfession(profession);

//   // Guardian runs in parallel — no strict rate limit on free tier
//   const guardianFetches = [
//     fetchFromGuardian(topics.guardian.category1.join(' OR '), slug, true),
//     ...topics.guardian.category2.map((phrase) => fetchFromGuardian(phrase, slug, false)),
//   ];

//   // // NewsAPI runs sequentially — 1 req/sec rate limit on free tier
//   // const newsApiCalls = [
//   //   () => fetchFromNewsApi(topics.newsApi.category1.join(' OR '), true),
//   //   ...topics.newsApi.category2.map((phrase) => () => fetchFromNewsApi(phrase, false)),
//   // ];

//   // // Run Guardian in parallel, NewsAPI sequentially, both in parallel with each other
//   // const [guardianResults, newsApiResultArrays] = await Promise.all([
//   //   Promise.allSettled(guardianFetches),
//   //   fetchNewsApiSequential(newsApiCalls),
//   // ]);

//   // const guardianArticles = guardianResults
//   //   .filter((r) => r.status === 'fulfilled')
//   //   .flatMap((r) => r.value);

//   // const newsApiArticles = newsApiResultArrays.flat();
//   const [guardianSettled, newsApiArticles] = await Promise.all([
//     Promise.allSettled(guardianFetches),
//     fetchFromNewsApi(topics),   // ← single call, passes full topics object
//   ]);

//   const guardianArticles = guardianSettled
//     .filter((r) => r.status === 'fulfilled')
//     .flatMap((r) => r.value);
//   // ── Profession-specific fetches run in parallel ───────────────────────────
//   const specificFetches = [];

//   if (slug === 'software engineer') {
//     if (topics.devTo?.length)      specificFetches.push(fetchFromDevTo(topics.devTo));
//     if (topics.hackerNews?.length) specificFetches.push(fetchFromHackerNews(topics.hackerNews));
//   }
//   if (slug === 'lawyer') {
//     topics.courtListener?.forEach(q  => specificFetches.push(fetchFromCourtListener(q)));
//     topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
//   }
//   if (slug === 'nurse') {
//     specificFetches.push(fetchFromWHO());
//     specificFetches.push(fetchFromCDC());
//   }
//   if (slug === 'accountant') {
//     specificFetches.push(fetchFromFMP(topics.fmp || []));
//     topics.federalRegister?.forEach(q => specificFetches.push(fetchFromFederalRegister(q)));
//   }
//   if (slug === 'electrical engineer') {
//     topics.newsData?.forEach(q => specificFetches.push(fetchFromNewsData(q)));
//   }

//   const specificSettled = await Promise.allSettled(specificFetches);
//   const specificArticles = specificSettled
//     .filter((r) => r.status === 'fulfilled')
//     .flatMap((r) => r.value);

//   const allArticles = mergeAndDeduplicate(guardianArticles, newsApiArticles, specificArticles);

//   if (allArticles.length === 0) return { articles: [], categorized: [] };

//   const articlesForGemini = allArticles.slice(0, 200).map((a, i) => ({
//     index:       i,
//     title:       a.title,
//     description: a.description?.trim() || '[no description]',
//   }));

//   console.log('\n========== FETCH SUMMARY ==========');
//   console.log('Guardian:', guardianArticles.length);
//   console.log('NewsAPI:', newsApiArticles.length);
//   console.log('Specific:', specificArticles.length);
//   console.log('After Dedup:', allArticles.length);
//   console.log('===================================\n');

//   const categorized = await filterAndCategorizeNews(profession, articlesForGemini, cvContext);

//   console.log('\n========== GEMINI ==========');
//   console.log('Articles Sent:', articlesForGemini.length);
//   console.log('Categories Returned:', categorized.length);
//   categorized.forEach(c => console.log(`${c.category}: ${c.articles.length} articles`));
//   console.log('============================\n');

//   return { articles: allArticles, categorized };
// }

// ─── Build final result shape ─────────────────────────────────────────────────

function buildResult(articles, categorized) {
  return categorized.map(({ category, articles: geminiArticles }) => ({
    sectionHeading: category,
    content: geminiArticles
      .filter(({ index: i }) => i >= 0 && i < articles.length)
      .map(({ index: i, expandedSummary }) => {
        const a = articles[i];
        return {
          newsDate:     formatDate(a.publishedAt),
          newsCategory: a.tags?.length ? a.tags : [category],
          newsSource:   a.source,
          newsLogoUrl:  a.sourceLogo,
          newsImageUrl: a.imageUrl,
          newsTitle:    a.title,
          newsSummary:  expandedSummary || a.description,
          newsUrl:      a.url,
          newsByline:   a.byline,
        };
      }),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH 1 — Profession-based fetch (shared cache, no CV)
//
// For software engineers: generateNewsTopics returns { topics, hnQueries }
// in ONE Gemini call — no extra API cost.
// For all other professions: returns string[] as before.
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFreshNews(profession) {
  // const start = Date.now();
  // const slug  = detectProfession(profession);

  // let topics;
  // let hnQueries = null;

  // if (slug === 'software engineer') {
  //   //const result = await generateNewsTopics(profession, { includeHnQueries: true });
  //   const result=generateApiSpecificTopics(profession, slug); 
  //   if (Array.isArray(result)) {
  //     // Backward-compatible: plain array returned
  //     topics = result;
  //   } else {
  //     topics    = result.topics;
  //     hnQueries = result.hnQueries || null;
  //   }
  // } else {
  //   topics = await generateNewsTopics(profession);
  // }
  
  const start = Date.now();
  const slug  = detectProfession(profession);
  const topics = await generateApiSpecificTopics(profession, slug);
  const { articles, categorized } = await fetchAndCategorize(profession, topics, null);
  // const { articles, categorized } = await fetchAndCategorize(
  //   profession, topics, null, hnQueries,
  // );
 // if (articles.length === 0) return [];
   if (articles.length === 0) {
    const err = new Error('Could not retrieve news articles at this time. Please try again later.');
    err.status = 502;
    err.code = 'NEWS_UNAVAILABLE';
    throw err;
  }

  const result       = buildResult(articles, categorized);
  const articleCount = result.reduce((sum, s) => sum + s.content.length, 0);

  await setCache('news', profession, result, {
    fetchDurationMs: Date.now() - start,
    articleCount,
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH 2 — CV-based fetch (personal cache)
//
// Topics already generated during CV analysis — passed in directly.
// For software engineers: first 3 CV topics reused as HN queries directly
// (CV keywords are specific enough — no extra Gemini call needed).
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFreshNewsWithTopics(profession, topics, userId) {
    const start = Date.now();
    const slug = detectProfession(profession);

    console.log(
        `[News] CV fetch — user:${userId}, profession:${profession} (${slug || "generic"}), topics:${topics.length}`
    );

    const cvContext = {
        topics,
    };

    const newTopics = await generateApiSpecificTopics(
        profession,
        slug,
        cvContext
    );

    const { articles, categorized } =
        await fetchAndCategorize(
            profession,
            newTopics,
            cvContext
        );

    if (articles.length === 0) return [];

    const result = buildResult(articles, categorized);

    const articleCount = result.reduce(
        (sum, s) => sum + s.content.length,
        0
    );

    await setPersonalCache("news", userId, result, {
        fetchDurationMs: Date.now() - start,
        articleCount,
    });

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — two-tier cache lookup (unchanged public contract)
// ═══════════════════════════════════════════════════════════════════════════════

async function getPersonalizedNews(profession, userId = null) {
  console.log(`[NewsService] getPersonalizedNews — user:${userId}, profession:${profession}`);

  if (userId) {
    const personal = await getPersonalCache('news', userId);
    if (personal) return personal;
  }

  const shared = await getCache('news', profession);
  if (shared) return shared;
  if (!isDbAvailable()) {
    const err = new Error(
      'No Internet connectivity. Please try again.',
    );
    err.status = 503;
    err.code   = 'DB_CONNECTION_ERROR';
    throw err;
  }

  return fetchFreshNews(profession);
}

module.exports = {
  getPersonalizedNews,
  fetchFreshNews,
  fetchFreshNewsWithTopics,
};