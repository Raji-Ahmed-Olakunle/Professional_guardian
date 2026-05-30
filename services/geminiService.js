// const axios = require('axios');

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// if (!GEMINI_API_KEY) {
//   // Fail fast on misconfiguration so the app doesn't silently degrade.
//   // This throws once at module load time if the key is missing.
//   throw new Error('GEMINI_API_KEY environment variable is not set');
// }

// const client = axios.create({
//   baseURL:
//     process.env.GEMINI_API_BASE_URL ||
//     'https://generativelanguage.googleapis.com/v1/',
//   timeout: 15000,
//   params: {
//     key: GEMINI_API_KEY,
//   },
// });

// /**
//  * Generate 5–7 profession-related topics using Gemini.
//  *
//  * @param {string} profession
//  * @returns {Promise<string[]>} topics
//  */
// async function generateProfessionTopics(profession) {
//   if (!profession || typeof profession !== 'string') {
//     const err = new Error('profession is required and must be a string');
//     err.status = 400;
//     throw err;
//   }

//   const prompt = `You are helping design educational content for a professional.
// Profession: "${profession}".
// Return a concise bullet list of 5 to 7 key topics this professional should stay up to date on.
// Respond ONLY with a plain list, one topic per line, no numbering and no extra explanation.`;

//   try {
//     const response = await client.post(
//       '/models/gemini-2.5-flash:generateContent',
//       {
//         contents: [
//           {
//             parts: [{ text: prompt }],
//           },
//         ],
//       },
//     );

//     const text =
//       response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

//     if (!text) {
//       const err = new Error('No content returned from Gemini API');
//       err.status = 502;
//       throw err;
//     }

//     const topics = text
//       .split('\n')
//       .map((line) => line.trim().replace(/^[-*]\s*/, '')) // strip bullets
//       .filter(Boolean);

//     // Clamp to 5–7 topics as requested.
//     if (topics.length > 7) {
//       return topics.slice(0, 7);
//     }
//     if (topics.length < 5) {
//       return topics;
//     }
//     console.log(topics);
//     return topics;
//   } catch (error) {
//     // Normalize axios / API errors to a clean Error for the rest of the app.
//     const err = new Error(
//       error.response?.data?.error?.message ||
//         error.message ||
//         'Failed to generate topics from Gemini API',
//     );
//     err.status = error.response?.status || 502;
//     throw err;
//   }
// }

// module.exports = {
//   generateProfessionTopics,
// };

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const client = axios.create({
  baseURL:
    process.env.GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1/',
  timeout:  90000,
  params: { key: GEMINI_API_KEY },
});
// ─── Core Gemini caller ───────────────────────────────────────────────────────
// Add at top of geminiService.js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.post(
        // 'gemini-2.5-flash-lite:generateContent',
        'gemini-flash-latest:generateContent',
        { contents: [{ parts: [{ text: prompt }] }] },
      );
      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        const err = new Error('No content returned from Gemini API');
        err.status = 502;
        throw err;
      }

      return text;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      // Rate limited — wait and retry
      if (status === 429) {
        // Extract retry delay from Gemini error message if available
        const retryMatch = message.match(/retry in (\d+)/i);
        const waitMs = retryMatch
          ? parseInt(retryMatch[1]) * 1000 + 2000
          : attempt * 15000; // 15s, 30s, 45s backoff

        console.warn(
          `[Gemini] Rate limited. Waiting ${waitMs / 1000}s before retry ${attempt}/${retries}...`,
        );
        await sleep(waitMs);
        continue;
      }

      // Non-rate-limit error — throw immediately
      const err = new Error(message || 'Gemini API call failed');
      err.status = status || 502;
      throw err;
    }
  }

  const err = new Error('Gemini API call failed after max retries');
  err.status = 429;
  throw err;
}



// ─── JSON parser helper ───────────────────────────────────────────────────────

function parseJSON(text) {
  // Strip markdown code fences if Gemini wraps response in ```json ... ```
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const err = new Error('Failed to parse Gemini JSON response');
    err.status = 502;
    err.raw = text;
    throw err;
  }
}

// ─── News: Generate broad search topics ──────────────────────────────────────

/**
 * Generate 4-5 broad news search topics for a profession.
 * These are used to fetch broadly from NewsAPI/Guardian.
 *
 * @param {string} profession
 * @returns {Promise<string[]>} e.g. ["AI tools for developers", "DevOps", ...]
 */
async function generateNewsTopics(profession) {
  if (!profession || typeof profession !== 'string') {
    const err = new Error('profession is required and must be a string');
    err.status = 400;
    throw err;
  }

  const prompt = `You are helping fetch relevant news for a ${profession}.

Generate 5 broad but specific search topics suitable for querying a news API.
Topics must be directly relevant to the day-to-day work and industry of a ${profession}.

Return ONLY a JSON array of strings, no extra text, no markdown:
["topic one", "topic two", "topic three", "topic four", "topic five"]

Rules:
- Each topic should be 1-2 words
- no repetition of words 
- Topics must be searchable news headlines (not abstract concepts)
- Tailor strictly to a ${profession}
- No numbering, no bullets, no explanation`;

  const text = await callGemini(prompt);
  const topics = parseJSON(text);

  if (!Array.isArray(topics) || topics.length === 0) {
    const err = new Error('Gemini returned invalid news topics format');
    err.status = 502;
    throw err;
  }

  return topics.slice(0, 5);
}

// ─── News: Filter and categorize raw articles ─────────────────────────────────

// async function filterAndCategorizeNews(profession, articles) {
//   if (!articles || articles.length === 0) {
//     return [];
//   }

//    const prompt = `You are a professional content curator and news editor for a ${profession}.

// Below are ${articles.length} raw news articles:
// ${articles.map((a, i) => `[${i}] Title: "${a.title}" | Summary: "${a.description || 'no description'}"`).join('\n')}

// Your tasks:
// 1. Remove articles that are NOT relevant to a ${profession}'s professional interests
// 2. Group remaining articles into  meaningful professional categories
// 3. Each category should have at least 2 articles
// 4. For each article, write an expanded 3 sentence professional summary using the title and 
//    original summary as your source of truth — add professional context a ${profession} would find useful
// Return ONLY valid JSON, no markdown, no explanation:
// [
//   {
//     "category": "AI & Developer Tools",
//     "articles": [
//       { "index": 0, "expandedSummary": "3 sentence professional summary here..." },
//       { "index": 3, "expandedSummary": "3 sentence professional summary here..." }
//     ]
//   },
//   {
//     "category": "Security",
//     "articles": [
//       { "index": 1, "expandedSummary": "3 sentence professional summary here..." },
//       { "index": 5, "expandedSummary": "3 sentence professional summary here..." }
//     ]
//   }
// ]

// Rules:
// - Use only the original indexes from the list above
// - Do not invent or modify articles
// - Category names must be concise (2-4 words) and reflect a specific domain of the profession's work
// - if no articles are relevant, return an empty array
// - if article does not relate to a professional interest of a ${profession}, it should be excluded entirely, not just put in a "Misc" category
// - expandedSummary must be 3-4 sentences, professional in tone
// - If fewer than 6 articles are relevant, still group what remains`;

 
// const text = await callGemini(prompt);
// const categorized = parseJSON(text);

//   if (!Array.isArray(categorized)) {
//     const err = new Error('Gemini returned invalid categorization format');
//     err.status = 502;
//     throw err;
//   }

//   return categorized;
// }

async function filterAndCategorizeNews(profession, articles, cvContext = null) {
  if (!articles || articles.length === 0) return [];

  // Build CV context hint if available
  const cvHint = cvContext
    ? `\nThe user has uploaded their CV. Their specific areas of expertise and interest include: ${cvContext.topics.slice(0, 8).join(', ')}. ${cvContext.note}.`
    : '';

  const prompt = `You are a professional content curator and news editor for a ${profession}.${cvHint}

Below are ${articles.length} raw news articles:
${articles.map((a, i) => `[${i}] Title: "${a.title}" | Summary: "${a.description || 'no description'}"`).join('\n')}

Your tasks:
1. Remove articles that are NOT relevant to a ${profession}'s professional interests
2. Group remaining articles into meaningful professional categories
3. Each category should have at least 2 articles
4. For each article, write an expanded 3 sentence professional summary using the title and original summary as your source of truth — add professional context a ${profession} would find useful

Return ONLY valid JSON, no markdown, no explanation:
[
  {
    "category": "AI & Developer Tools",
    "articles": [
      { "index": 0, "expandedSummary": "3 sentence professional summary here..." },
      { "index": 3, "expandedSummary": "3 sentence professional summary here..." }
    ]
  }
]

Rules:
- Use only the original indexes from the list above
- Do not invent or modify articles
- Category names must be concise (2-4 words) and reflect a specific domain of the profession's work
- If no articles are relevant, return an empty array
- Exclude articles not related to a ${profession}'s professional interest entirely
- expandedSummary must be 3 sentences, professional in tone
- If fewer than 6 articles are relevant, still group what remains${cvContext ? '\n- Give extra weight to articles matching the user\'s CV expertise areas' : ''}`;

  const text = await callGemini(prompt);
  const categorized = parseJSON(text);

  if (!Array.isArray(categorized)) {
    const err = new Error('Gemini returned invalid categorization format');
    err.status = 502;
    throw err;
  }

  return categorized;
}

// ─── Books: Generate exact book recommendations ───────────────────────────────

/**
 * Generate a list of specific book recommendations with categories
 * for a given profession. Returns exact titles + authors for precise
 * OpenLibrary lookups.
 *
 * @param {string} profession
 * @returns {Promise<Array<{ title: string, author: string, category: string }>>}
 */
async function generateBookRecommendations(profession) {
  if (!profession || typeof profession !== 'string') {
    const err = new Error('profession is required and must be a string');
    err.status = 400;
    throw err;
  }

  const prompt = `You are a specialist librarian curating a reading list EXCLUSIVELY for a ${profession}.

Generate 30 books strictly relevant to the technical, clinical, or domain-specific practice of a ${profession}.

Return ONLY valid JSON, no markdown, no explanation:
[
  { "title": "Book Title", "author": "Author Name", "category": "Category Name" }
]
RULES:
1. Create EXACTLY 5 distinct profession-specific categories
2. Each category must have EXACTLY 6 books
3. Total: 30 books
4. Every book must be real (not made up)
5. Every category name must be profession-specific, NOT generic
6. NO books about: leadership, productivity, self-help, general business, communication skills, personal development
7. If a communication or ethics book is included, it must be specific to ${profession}
8. Books should be published after 2000 (unless timeless classics in the field)
9. All books should have clear practical application to ${profession}'s work
10. Distribute books evenly: 6 per category
INVALID BOOKS (forbidden for any profession):
- "The 7 Habits of Highly Effective People"
- "Dare to Lead"
- "Atomic Habits"
- "Crucial Conversations"
- Any generic business/self-help book
EXAMPLES OF VALID PROFESSION-SPECIFIC CATEGORIES:
- For Accountant: "Financial Statement Analysis", "Tax Planning", "Forensic Accounting", "Auditing Standards", "Cost Management"
- For Doctor: "Clinical Diagnostics", "Surgical Techniques", "Pharmacology", "Medical Ethics", "Patient Care Protocols"
- For Software Engineer: "System Design", "Advanced Algorithms", "Cloud Architecture", "DevOps Practices", "Performance Optimization"

Return ONLY valid JSON matching the provided schema.`;


  try {
    const text = await callGemini(prompt);
    const books = parseJSON(text);

    if (!Array.isArray(books) || books.length === 0) {
      const err = new Error('Gemini returned invalid book recommendations format');
      err.status = 502;
      throw err;
    }

    // Post-generation guard — filter out known generic books that
    // Gemini might still sneak in despite instructions
    
    const blocklist = [
      '7 habits',
      'dare to lead',
      'atomic habits',
      'crucial conversations',
      'how to win friends',
      'deep work',
      'good to great',
      'start with why',
      'the lean startup',
      'thinking fast and slow',
      'outliers',
      'grit',
      'mindset',
    ];

    const filtered = books.filter((book) => {
      const titleLower = book.title?.toLowerCase() || '';
      return !blocklist.some((blocked) => titleLower.includes(blocked));
    });

    if (filtered.length < 10) {
      // If too many were filtered, something went wrong — throw so caller can retry
      const err = new Error('Too many generic books returned by Gemini — retry');
      err.status = 502;
      throw err;
    }

    return filtered;
  } catch (error) {
    const err = new Error(
      error.response?.data?.error?.message ||
        error.message ||
        'Failed to generate book recommendations',
    );
    err.status = error.response?.status || 502;
    throw err;
  }


  /**
 * Extract structured profile data from CV text.
 * Also generates search keywords for news, books and jobs.
 *
 * @param {string} cvText — raw text extracted from PDF
 * @param {string} profession — user's stated profession from signup
 * @returns {Promise<object>} structured profile
 */

}

async function extractCvProfile(cvText, profession) {
  const prompt = `You are a professional CV analyzer and content strategist.

Analyze the CV below and extract structured information.
The person's stated profession is: "${profession}".

CV TEXT:
"""
${cvText.slice(0, 8000)}
"""
Extract information and return ONLY valid JSON matching this exact schema, no markdown:
{
  "name": "Full name or null",
  "roles": ["current or target job titles, max 4"],
  "skills": ["technical/domain skills only, max 15, no soft skills"],
  "experience_level": "Junior|Intermediate|Senior|Lead|Executive or null",
  "domains": {
    "primary": "main professional domain e.g. Artificial Intelligence",
    "secondary": ["up to 3 secondary domains"]
  },
  "location": "country name only e.g. United Kingdom, or null if not found",
  "preferred_job_type": "remote|onsite|hybrid|any",
  "keywords": {
    "news": [
      "10 specific professional news search topics — see rules below"
    ],
    "books": ["5 specific book topic search terms based on skills and domain"],
    "jobs": ["3 specific job title search queries e.g. 'senior data scientist remote UK'"]
  }
}

NEWS KEYWORD RULES (IMPORTANT):

* Generate EXACTLY 10 professional news search queries
* Queries must work well with news APIs like NewsAPI and The Guardian
* Use terms commonly found in article headlines
* Prefer:

  * technologies
  * frameworks
  * industries
  * platforms
  * ecosystem trends
  * company/product categories
* Avoid:

  * overly technical tutorial phrases
  * optimization phrases
  * implementation details
  * long-tail engineering terms
* Each query should be 1-4 words maximum
* Queries should return MANY relevant articles, not niche tutorials

GOOD:
"Flutter"
"Supabase"
"mobile app security"
"African tech startups"
"cross platform apps"
"AI developer tools"
"cloud computing"
"backend development"
"fintech Africa"
"developer productivity"

BAD:
"SQLite performance optimization mobile"
"Dart state management clean architecture"
"Node.js REST API development"
"neural network optimization techniques"

- Location rule: if location is found in CV, include 1-2 location-specific topics
  e.g. if location is "Nigeria" → include "Nigeria tech industry" or "African fintech"
  if location is null → keep all topics global
- Each topic must be 3-6 words, specific and searchable in a news API
- Topics must reflect seniority level — Senior/Lead get strategic topics, Junior get technical

BOOK KEYWORD RULES:
- 5 specific technical topics directly related to the person's skills/domain
- e.g. "deep learning neural networks", "MLOps production systems"

JOB KEYWORD RULES:
- 3 job search queries combining role + experience level
- If location found: include location in at least one query
- e.g. "senior machine learning engineer remote", "lead data scientist London", "ML engineer fintech"

GENERAL RULES:
- Extract only what is clearly in the CV — do not invent information
- skills: technical only, no "communication", "teamwork", "leadership"
- If a field cannot be determined, use null for strings or [] for arrays
- preferred_job_type: look for "remote", "hybrid", location preferences in CV`;

  const text = await callGemini(prompt);
  return parseJSON(text);
}

module.exports = {
  extractCvProfile,
  generateNewsTopics,
  filterAndCategorizeNews,
  generateBookRecommendations,
};
