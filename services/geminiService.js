


const { geminiClient } = require('./geminiClient');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    // await waitForGeminiSlot();
    try {
      const response = await geminiClient.post(
     //  'gemini-2.5-flash-lite:generateContent',
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
  err.status = 503;   // service unavailable after exhausting retries
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
// async function generateNewsTopics(profession) {
//   if (!profession || typeof profession !== 'string') {
//     const err = new Error('profession is required and must be a string');
//     err.status = 400;
//     throw err;
//   }

//   const prompt = `You are helping fetch relevant news for a ${profession}.

// Generate 5 broad but specific search topics suitable for querying a news API.
// Topics must be directly relevant to the day-to-day work and industry of a ${profession}.

// Return ONLY a JSON array of strings, no extra text, no markdown:
// ["topic one", "topic two", "topic three", "topic four", "topic five"]

// Rules:
// - Each topic should be 1-2 words
// - no repetition of words 
// - Topics must be searchable news headlines (not abstract concepts)
// - Tailor strictly to a ${profession}
// - No numbering, no bullets, no explanation`;

//   const text = await callGemini(prompt);
//   const topics = parseJSON(text);

//   if (!Array.isArray(topics) || topics.length === 0) {
//     const err = new Error('Gemini returned invalid news topics format');
//     err.status = 502;
//     throw err;
//   }

//   return topics.slice(0, 5);
// }

async function generateNewsTopics(profession, options = {}) {
  if (!profession || typeof profession !== 'string') {
    const err = new Error('profession is required and must be a string');
    err.status = 400;
    throw err;
  }
 
  const { includeHnQueries = false } = options;
 
  // ── Software engineer: combined prompt, one call ──────────────────────────
  if (includeHnQueries) {
    const prompt = `You are helping fetch relevant news for a ${profession}.
 
Generate two sets of search queries:
1. Five broad news search topics for Guardian/NewsAPI (headline-friendly, 1-2 words each)
2. Four Hacker News search queries (community/ecosystem focused, 2-4 words each)
 
Return ONLY valid JSON, no markdown, no explanation:
{
  "topics": ["topic one", "topic two", "topic three", "topic four", "topic five"],
  "hnQueries": ["query one", "query two", "query three", "query four"]
}
 
Rules for topics (Guardian / NewsAPI):
- 1-2 words each
- No repeated words across entries
- Must read like searchable news headlines
- Strictly relevant to a ${profession}'s day-to-day work and industry
 
Rules for hnQueries (Hacker News Algolia):
- 2-4 words each
- Reflect what a ${profession} would actually search on Hacker News
- Community and ecosystem focused (e.g. "open source tools", "AI developer productivity")
- No overlap with the topics list above`;
 
    const text   = await callGemini(prompt);
    const parsed = parseJSON(text);
 
    if (!parsed?.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      const err = new Error('Gemini returned invalid news topics format');
      err.status = 502;
      throw err;
    }
 
    return {
      topics:    parsed.topics.slice(0, 5),
      hnQueries: Array.isArray(parsed.hnQueries) ? parsed.hnQueries.slice(0, 4) : [],
    };
  }
 
  // ── All other professions: original behaviour, returns string[] ───────────
  const prompt = `You are helping fetch relevant news for a ${profession}.
 
Generate 5 broad but specific search topics suitable for querying a news API.
Topics must be directly relevant to the day-to-day work and industry of a ${profession}.
 
Return ONLY a JSON array of strings, no extra text, no markdown:
["topic one", "topic two", "topic three", "topic four", "topic five"]
 
Rules:
- Each topic should be 1-2 words
- No repetition of words
- Topics must be searchable news headlines (not abstract concepts)
- Tailor strictly to a ${profession}
- No numbering, no bullets, no explanation`;
 
  const text   = await callGemini(prompt);
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
function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
async function filterAndCategorizeNews(profession, articles, cvContext = null) {
  if (!articles || articles.length === 0) return [];
const maxIndex = articles.length - 1;
  // Build CV context hint if available
  const cvHint = cvContext
    ? `\nThe user has uploaded their CV. Their specific areas of expertise and interest include: ${cvContext.topics.slice(0, 8).join(', ')}. ${cvContext.note}.`
    : '';

//   const prompt = `You are a professional content curator and news editor for a ${profession}.${cvHint}

// Below are ${articles.length} raw news articles:
// ${articles.map((a, i) => `[${i}] Title: "${a.title}" | Summary: "${a.description || 'no description'}"`).join('\n')}

// Your tasks:
// 1. Filter out articles with ZERO professional relevance to a ${profession} (see rules below)
// 2. Group remaining articles into meaningful professional categories
// 3. Each category should have at least 2 articles
// 4. For each article, write an expanded 3 sentence professional summary using the title and original summary as your source of truth — add professional context a ${profession} would find useful
 
// Return ONLY valid JSON, no markdown, no explanation:
// [
//   {
//     "category": "AI & Developer Tools",
//     "articles": [
//       { "index": 0, "expandedSummary": "3 sentence professional summary here..." },
//       { "index": 3, "expandedSummary": "3 sentence professional summary here..." }
//     ]
//   }
// ]
 
// INCLUSION RULES — include an article if it relates to ANY of the following for a ${profession}:
// - Tools, frameworks, platforms, or technologies used in the profession
// - New versions, releases, updates, or deprecations of relevant tools/standards
// - Industry news, trends, or shifts that affect how the profession operates
// - Regulatory changes, policy updates, legal rulings, or compliance requirements
// - Scientific findings, clinical updates, or research outcomes relevant to practice
// - Business, market, or economic developments that affect the profession's sector
// - Career, hiring, salary, or workforce trends in the profession
// - Security, safety, or risk events relevant to the profession
// - Events, conferences, or community discussions significant to the profession
// - Any product, company, or organisation that is a major player in the profession's ecosystem
 
// EXCLUSION RULES — only exclude if ALL of the following are true:
// - The article has no plausible connection to the profession's daily work, tools, or sector
// - It is not about any technology, regulation, market, or practice the profession touches
// - It would not be useful context even indirectly (e.g. a general celebrity article for a software engineer)
// - When in doubt, INCLUDE rather than exclude — over-inclusion is better than missing a relevant article
 
// CATEGORY RULES:
// - Category names must be concise (2-4 words) and specific to the profession's domain
// - Examples for software engineer: "Framework Releases", "AI Developer Tools", "Cloud Infrastructure", "Security Vulnerabilities", "Open Source"
// - Examples for nurse: "Clinical Practice Updates", "Drug Safety Alerts", "Public Health", "Healthcare Policy"
// - Examples for lawyer: "Regulatory Changes", "Court Rulings", "Compliance Updates", "Legal Tech"
// - Examples for accountant: "Tax Regulation", "Financial Standards", "Market Movements", "Audit & Compliance"
// - Examples for electrical engineer: "Power Systems", "Renewable Energy", "Semiconductor News", "EV & Battery Tech"
// - Do NOT use vague categories like "General News", "Miscellaneous", or "Other"
// - If fewer than 6 articles are relevant, still group what remains
// ${cvContext ? '- Give extra weight to articles matching the user\'s CV expertise areas' : ''}
 
// expandedSummary rules:
// - Must be exactly 3 sentences
// - Professional in tone
// - Add context a ${profession} would find useful beyond what the title says
// - Use only the title and original summary as your source — do not invent facts or details not in the original article
// - group what remains${cvContext ? '\n- Give extra weight to articles matching the user\'s CV expertise areas' : ''}`;
const prompt = `You are a professional content curator for a ${profession}.${cvHint}

Below are ${articles.length} news articles (indexed 0 to ${articles.length - 1}):
${articles.map((a, i) => `[${i}] Title: "${a.title}" | Summary: "${a.description || 'no description'}"`).join('\n')}

══════════════════════════════════════
STEP 1 — FILTER (be aggressive about INCLUSION)
══════════════════════════════════════
Keep an article if it has ANY plausible connection to a ${profession}'s work, including:
- Tools, frameworks, platforms, or technologies used in the profession
- Releases, updates, or deprecations of relevant tools/standards
- Industry news, trends, or shifts affecting how the profession operates
- Regulatory changes, policy updates, legal rulings, or compliance requirements
- Scientific findings, clinical updates, or research outcomes relevant to practice
- Business, market, or economic developments affecting the profession's sector
- Career, hiring, salary, or workforce trends in the profession
- Security, safety, or risk events relevant to the profession
- Events, conferences, or community discussions significant to the profession
- Any product, company, or organisation that is a major player in the profession's ecosystem
- Do NOT create catch-all economic or supply chain categories unless the 
  articles are specifically about healthcare supply chains, medical equipment 
  shortages, or pharmaceutical logistics
- If you find yourself creating a category whose only purpose is to house 
  otherwise-excluded articles, those articles should be excluded instead
Only EXCLUDE an article if it matches ANY ONE of the following:
✗ The article's primary subject is celebrity, entertainment, sport, or lifestyle 
✗ The article is an opinion column, satirical piece, or editorial with no factual professional content
✗ The article is a job posting, vacancy notice, call for applications, call for consultants, 
  call for proposals, or administrative procurement notice from any organisation
✗ The article was published before ${getDateDaysAgo(90)} — exclude all outdated content regardless of topic
✗ The article is about travel, tourism, restaurants, or food unless it contains an explicit 
  regulatory, outbreak, or clinical angle stated in the title or description
✗ The article is a product review, buying guide, or consumer advice piece
✗ The article covers social media drama, influencer activity, or viral trends
✗ The article covers an awards ceremony, charity gala, or cultural festival
✗ The article is a crowdfunding campaign, Kickstarter, or hobbyist project announcement
✗ The article is a press release promoting an unknown vendor with no verifiable news value
✗ The article is a regional or local story with no stated national, industry, or policy implication
✗ The article covers geopolitical conflict, war, or international relations where the 
  connection to this profession requires you to construct an argument — if the article 
  does not itself state a professional angle, exclude it
✗ The article is an obituary or biographical retrospective unless the subject founded, 
  defined, or significantly transformed this profession
✗ The article is speculation or rumour with no named source, confirmed quote, or verifiable fact
✗ The article's only connection to this profession is a passing metaphor, analogy, 
  or single incidental mention (e.g. "like a software bug", "a nurse was present")
✗ The article covers industries with no overlap with this profession's sector — 
  airlines, fashion retail, sports clubs, entertainment studios — unless the article 
  explicitly names a direct impact on this profession's tools, patients, or regulations
✗ The article is a historical retrospective or anniversary piece with no current 
  actionable relevance stated in the description

DOUBT RULE: Only apply doubt in favour of keeping when the article is clearly 
within the profession's domain but you are unsure of its category. 
If you are unsure whether the article is relevant to the profession at all, EXCLUDE it
══════════════════════════════════════
STEP 2 — CATEGORIZE
══════════════════════════════════════
Group kept articles into professional categories. Rules:
- Category names: concise (2–4 words), domain-specific (e.g. "Tax Regulation", "Audit Standards", "Market Movements", "Financial Reporting")
- NEVER use vague names like "General News", "Miscellaneous", or "Other"
- Minimum 2 articles per category — if a category would have only 1 article, merge it into the closest related category
- Uncategorizable articles that passed the filter: place them in the most plausible category rather than discarding them
- Do NOT create catch-all economic or supply chain categories unless the 
  articles are specifically about healthcare supply chains, medical equipment 
  shortages, or pharmaceutical logistics
- If you find yourself creating a category whose only purpose is to house 
  otherwise-excluded articles, those articles should be excluded instead
${cvContext ? '- Prioritize articles matching the user\'s CV expertise areas' : ''}

══════════════════════════════════════
STEP 3 — EXPAND SUMMARIES
══════════════════════════════════════
For each kept article, write an expandedSummary:
- Exactly 3 sentences
- Professional tone suited to a ${profession}
- Sentence 1: what the article is about (based on title + summary only)
- Sentence 2: why it matters to a ${profession} specifically
- Sentence 3: a practical implication or action point
- Do NOT invent facts not present in the original title/summary
IMPORTANT PROCESSING RULE:
- Process each article exactly once, in order from [0] to [${maxIndex}]
- The moment you assign an article to a category, it is done — do not revisit it
- An article that is excluded is also done — do not revisit it
- Every article lands in exactly one outcome: assigned to a category, or excluded
══════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════
Return ONLY a valid JSON array. No markdown, no explanation, no wrapper object.
Schema:
[
  {
    "category": "Category Name",
    "articles": [
      { "index": 0, "expandedSummary": "Sentence one. Sentence two. Sentence three." }
    ]
  }
]

Every article index must match exactly the [N] index from the input list above.
Do not skip articles that passed your filter. Do not add articles that failed it.`;
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
  callGemini,
  parseJSON,
  extractCvProfile,
  generateNewsTopics,
  filterAndCategorizeNews,
  generateBookRecommendations,
};
