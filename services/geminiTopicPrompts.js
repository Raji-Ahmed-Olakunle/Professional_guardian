
const { callGemini, parseJSON } = require('./geminiService');

// ═══════════════════════════════════════════════════════════════════════════════
// SLUG HELPERS — mirrors detectProfession() in newsService.js
// ═══════════════════════════════════════════════════════════════════════════════

const is = {
  softwareEngineer:   (s) => s === 'software engineer',
  lawyer:             (s) => s === 'lawyer',
  accountant:         (s) => s === 'accountant',
  electricalEngineer: (s) => s === 'electrical engineer',
  nurse:              (s) => s === 'nurse',
};

// ═══════════════════════════════════════════════════════════════════════════════
// API INSTRUCTION BLOCKS
// Each block explains to Gemini exactly how that API indexes and searches.
// ═══════════════════════════════════════════════════════════════════════════════

const INSTRUCTIONS = {

  // ── Universal ──────────────────────────────────────────────────────────────

  guardian: `
━━ GUARDIAN — TWO KEYWORD CATEGORIES

Your output for Guardian must contain exactly two categories:
- category1: 5 single-word profession-exclusive terms
- category2: 5 multi-word combination phrases

━━ GUARDIAN CATEGORY 1 — Single Profession-Exclusive Words (5 words)

Each word will be searched individually AND all 5 will be combined as:
word1 OR word2 OR word3 OR word4 OR word5

EVERY word in this list is searched — even if one matches, the rest
are still searched independently. Each word must return its own results.
This category returns MORE articles than category 2 so precision is critical.

RULES:
- Single words only — no spaces, no hyphens joining two concepts
- The word must be SO specific to \${profession} that it cannot plausibly
  appear in a news article about any other profession
- If a historian, politician, sports journalist, or entertainer would
  use this word in their work → REJECT IT
- If the word appears in articles about a DIFFERENT profession → REJECT IT
- The word must be a technical term, proper noun, or domain-specific
  vocabulary that ONLY a \${profession} would recognise as their own

PROFESSION-EXCLUSIVITY TEST (apply to every word):
Ask: "Could this word appear prominently in an article that has
nothing to do with \${profession}?"
If YES → reject. If NO → accept.

TIER 1 — ALWAYS ACCEPTABLE (profession-exclusive by nature):
Named bodies, certifications, tools, instruments, drug classes,
legal doctrines, engineering components — things that exist ONLY
in this profession's vocabulary.

TIER 3 — ALWAYS REJECTED (generic, cross-profession):
"new", "latest", "update", "report", "guidelines", "rules", "changes",
"policy", "reform", "review", "measures", "framework", "system", "plan",
"announcement", "decision", "development", "news", "issue", "case",
"concern", "matter", "situation", "impact", "effect", "response",
"approach", "strategy", "initiative", "proposal", "scheme", "programme",
"industry", "sector", "market", "global", "national", "local"

CROSS-PROFESSION CONTAMINATION — STRICTLY FORBIDDEN:
A word that is exclusive to ANOTHER profession must never appear
in this profession's list. Examples of what NOT to do:
- "sentencing" → lawyer word, forbidden for accountant
- "clinical" → nurse word, forbidden for software engineer
- "semiconductor" → electrical engineer word, forbidden for lawyer
- "dosage" → nurse word, forbidden for accountant

GOOD Category 1 examples by profession:
accountant:    audit, GAAP, IFRS, depreciation, amortisation
nurse:         triage, cannula, catheter, dosage, haemorrhage
lawyer:        tort, plaintiff, indictment, jurisdiction, habeas
software eng:  refactoring, deployment, repository, codebase, runtime
electrical eng: semiconductor, inverter, capacitor, impedance, FPGA

BAD Category 1 examples (rejected):
- "financial" → used in sport, politics, entertainment → too generic
- "safety" → used everywhere → too generic
- "digital" → used in every profession → too generic
- "network" → IT AND telecoms AND politics → not exclusive enough
- "system" → tier 3 → rejected

DEDUPLICATION RULE:
No word used in category1 may appear in any category2 phrase.
Track every word used and do not reuse it.

Generate: 5 single words, each exclusively identifies \${profession} content

━━ GUARDIAN CATEGORY 2 — Combination Phrases (5 phrases)

Each phrase will be searched as all 2-word subsets using OR.
Example: "audit tax fraud" generates:
("audit tax") OR ("audit fraud") OR ("tax fraud")

This means EVERY 2-word subset of your phrase must independently
return \${profession} content when searched as an exact phrase.

SUBSET TEST — apply before submitting each phrase:
For a 3-word phrase A B C, verify all pairs:
  □ "A B" alone → returns \${profession} content?
  □ "A C" alone → returns \${profession} content?
  □ "B C" alone → returns \${profession} content?
ALL pairs must pass. If any pair fails → replace the failing word.

For a 2-word phrase A B, verify:
  □ "A B" alone → returns \${profession} content?
  □ "A" alone → returns \${profession} content? (single word fallback)
  □ "B" alone → returns \${profession} content?
All must pass.

RULES:
- 2-3 words per phrase (4+ words create too many subsets to verify)
- Every word must be at least tier-2 for \${profession}
- At least ONE word per phrase must be tier-1 (profession-exclusive)
- No word from category1 may be reused in category2
- Phrases must describe things journalists actually write headlines about
- No two phrases may share the same tier-1 anchor word

GOOD Category 2 examples by profession:
accountant:    "tax evasion", "SEC filing", "earnings restatement",
               "HMRC penalty", "corporate audit"
nurse:         "patient safety", "NHS staffing", "medication error",
               "clinical trial", "nursing shortage"
lawyer:        "Supreme Court", "antitrust ruling", "data breach lawsuit",
               "employment tribunal", "corporate fraud"
software eng:  "API security", "cloud outage", "open source",
               "zero-day exploit", "developer tools"
electrical eng:"chip shortage", "EV battery", "power grid",
               "solar panel", "grid stability"

BAD Category 2 examples:
- "new policy" → both words are tier 3 → rejected
- "industry update" → both words are tier 3 → rejected
- "financial reform" → "financial" too generic, "reform" tier 3 → rejected
- reusing "audit" if it was already in category1 → rejected

Generate: 5 combination phrases, all subset pairs verified for \${profession}`,

  newsApi: `
━━ NEWSAPI — TWO KEYWORD CATEGORIES

NewsAPI free tier: exact quoted phrase only ("phrase").
Single words must be EVEN MORE exclusive than Guardian because
NewsAPI searches title+description only — no full article body.
A generic word on NewsAPI returns massive noise with no way to filter.

Your output for NewsAPI must contain exactly two categories:
- category1: 5 single-word profession-exclusive terms
- category2: 5 multi-word combination phrases

━━ NEWSAPI CATEGORY 1 — Single Profession-Exclusive Words (5 words)

CRITICAL: NewsAPI category1 words have a HIGHER bar than Guardian.
Because NewsAPI only searches title and description (not full body),
a generic word will match thousands of unrelated articles.
Your word must be so profession-specific that a journalist would
ONLY use it when writing specifically about \${profession}.

Each word is searched as: "word1" OR "word2" OR "word3" OR "word4" OR "word5"
ALL 5 are searched — each independently returns its own results.
This category returns MORE articles so precision is CRITICAL.

NEWSAPI EXCLUSIVITY TEST (stricter than Guardian):
Ask THREE questions about every word:
  Q1: "Would a journalist use this word in a headline about \${profession}?" → must be YES
  Q2: "Would a journalist use this word in a headline about ANY other profession?" → must be NO
  Q3: "Would this word appear in the title or description of a non-\${profession} article?" → must be NO
All three must be answered correctly. One failure → reject the word.

ABSOLUTE REQUIREMENTS for NewsAPI category1:
- Must be a technical term, named institution, certification name,
  drug class name, legal doctrine, instrument name, or protocol name
  that exists EXCLUSIVELY in \${profession} vocabulary
- Must never appear in sports, entertainment, politics, or lifestyle headlines
- Must never be a word another profession uses as their own technical term
- Must be specific enough that if you searched it on Google News,
  90%+ of results would be about \${profession}

EXAMPLES OF WORDS THAT PASS for each profession:
accountant:
  PASS: "GAAP" → only in accounting/finance headlines
  PASS: "IFRS" → only in accounting/finance headlines  
  PASS: "amortisation" → only in accounting/finance headlines
  PASS: "PCAOB" → only in auditing headlines
  PASS: "depreciation" → primarily in accounting/finance headlines
  FAIL: "financial" → sports teams have financial news → rejected
  FAIL: "tax" → used in political, lifestyle, general news → too broad
  FAIL: "audit" → used in political contexts ("audit the vote") → borderline
  FAIL: "fraud" → crime news, not profession-exclusive → rejected
  FAIL: "compliance" → used in HR, politics, general business → rejected

nurse:
  PASS: "haemorrhage" → only in medical/clinical headlines
  PASS: "triage" → only in medical/emergency headlines
  PASS: "cannula" → only in medical headlines
  PASS: "catheterisation" → only in medical headlines
  PASS: "analgesia" → only in medical/pharmaceutical headlines
  FAIL: "hospital" → general news, politics → rejected
  FAIL: "patient" → general news → rejected
  FAIL: "health" → used everywhere → rejected
  FAIL: "care" → used everywhere → rejected
  FAIL: "medical" → used in politics, insurance, general news → rejected

lawyer:
  PASS: "jurisprudence" → only in legal headlines
  PASS: "tortious" → only in legal headlines
  PASS: "indictment" → only in legal/crime headlines
  PASS: "plaintiff" → only in legal headlines
  PASS: "habeas" → only in legal headlines
  FAIL: "court" → general news → rejected
  FAIL: "legal" → used everywhere → rejected
  FAIL: "judge" → general news → rejected
  FAIL: "law" → used everywhere → rejected
  FAIL: "criminal" → general crime news → rejected

software engineer:
  PASS: "refactoring" → only in software development headlines
  PASS: "codebase" → only in software development headlines
  PASS: "DevOps" → only in software/tech headlines
  PASS: "microservices" → only in software architecture headlines
  PASS: "Kubernetes" → only in software/cloud headlines
  FAIL: "digital" → used everywhere → rejected
  FAIL: "software" → general tech news → too broad
  FAIL: "computer" → general tech/education news → rejected
  FAIL: "data" → used everywhere → rejected
  FAIL: "internet" → used everywhere → rejected

electrical engineer:
  PASS: "semiconductor" → only in engineering/tech headlines
  PASS: "inverter" → only in electrical/energy headlines
  PASS: "FPGA" → only in electrical engineering headlines
  PASS: "photovoltaic" → only in solar/energy headlines
  PASS: "impedance" → only in electrical engineering headlines
  FAIL: "electric" → EVs, politics, general news → rejected
  FAIL: "power" → politics, sports, general → rejected
  FAIL: "energy" → politics, lifestyle → rejected
  FAIL: "battery" → consumer tech, EVs, general → rejected
  FAIL: "circuit" → used in sports (racing circuits) → borderline, avoid

DEDUPLICATION RULE:
No word used in category1 may appear in any category2 phrase.
Track every word used and do not reuse it.

Generate: 5 single words that pass ALL THREE NewsAPI exclusivity tests

━━ NEWSAPI CATEGORY 2 — Combination Phrases (5 phrases)

Each phrase is searched as: "full phrase"
The exact sequence must appear VERBATIM in a news headline or description.

Additionally, all 2-word subsets are searched via OR:
"audit tax fraud" → ("audit tax") OR ("audit fraud") OR ("tax fraud")

SUBSET TEST — apply before submitting:
For every 2-word subset of your phrase:
  □ Does this 2-word combination appear in real news headlines?
  □ Does this 2-word combination return \${profession} content?
  □ Would a journalist at Reuters, BBC, or Bloomberg write this exact pair?
ALL subsets must pass all three checks.

HEADLINE REALISM TEST:
The full phrase AND every 2-word subset must be something a journalist
actually writes. If you have never seen this combination in a real headline
→ shorten it or replace a word.

RULES:
- 2-3 words per phrase maximum
- Every word must pass the single-word profession test above
- At least one word per phrase must be profession-exclusive (tier-1 quality)
- No word from category1 may be reused
- No two phrases may share the same anchor word
- Phrases must be short enough to appear verbatim in real headlines

GOOD Category 2 examples by profession:
accountant:    "tax evasion", "SEC investigation", "earnings restatement",
               "HMRC ruling", "corporate fraud"
nurse:         "NHS staffing", "medication error", "patient safety",
               "nursing shortage", "clinical guidance"
lawyer:        "Supreme Court", "antitrust lawsuit", "employment tribunal",
               "data breach ruling", "corporate liability"
software eng:  "API vulnerability", "cloud security", "open source",
               "ransomware attack", "developer productivity"
electrical eng:"chip shortage", "solar capacity", "grid failure",
               "EV charging", "nuclear reactor"

BAD Category 2 examples:
- "new regulations" → tier-3 words, no profession anchor → rejected
- "industry report" → tier-3 words → rejected
- "policy update" → tier-3 words → rejected
- reusing a category1 word → rejected
- "sentencing guidelines" for accountant → lawyer word → rejected

Generate: 5 phrases, all subset pairs verified, no category1 words reused`,

  // ── Software Engineer ──────────────────────────────────────────────────────

  devTo: `
━━ DEV.TO (/api/articles?tag=TAG)
Dev.to uses a flat tag system. Tags are lowercase, single-word or hyphenated slugs.
Only use tags that ACTUALLY EXIST on dev.to — common real tags include:
  javascript, typescript, python, rust, go, java, csharp
  webdev, frontend, backend, fullstack, api
  devops, docker, kubernetes, cicd, aws, azure, gcp, cloudflare
  ai, machinelearning, llm, openai
  security, webassembly, database, testing, opensource, career
Rules:
- Lowercase only, no spaces (use hyphens: "machine-learning" not "machine learning")
- Must be a real dev.to tag — do not invent tags
- Pick tags that will surface articles a \${profession} actually reads
Generate: 6 Dev.to tags`,

  hackerNews: `
━━ HACKER NEWS ALGOLIA (?query=QUERY&tags=story)
Searches HN post titles and comment text. The HN community posts about:
- Specific tools and libraries by name: "htmx", "Bun runtime", "Neovim"
- Engineering war stories: "lessons learned", "how we scaled", "post-mortem"
- Industry discussions: "AI replacing programmers", "burnout tech"
- Show HN / Ask HN style: "open source alternative", "built with Rust"
- 2-4 words, conversational, ecosystem-focused
Generate: 4 Hacker News queries`,

  // ── Lawyer ────────────────────────────────────────────────────────────────

  courtListener: `
━━ COURTLISTENER (/search/?q=QUERY&type=o)
Full-text search of US court opinions (federal + state). Works with:
- Legal doctrine names: "qualified immunity", "piercing corporate veil", "fair use"
- Statute/regulation references: "Section 230", "Title VII", "GDPR enforcement"
- Subject matter: "employment discrimination arbitration", "patent claim construction"
- Do NOT use case names — focus on legal issues and doctrines
Generate: 3 CourtListener queries`,

  federalRegister: `
━━ FEDERAL REGISTER (/documents.json?conditions[term]=QUERY)
US federal agency rules, notices, proposed regulations. Works with:
- Agency + topic: "SEC disclosure", "IRS cryptocurrency reporting", "OSHA ergonomics"
- Regulatory area plain English: "environmental impact assessment", "data breach notification"
- Use terms that appear in official federal document titles
Generate: 3 Federal Register queries`,

  // ── Accountant ────────────────────────────────────────────────────────────

  fmp: `
━━ FINANCIAL MODELING PREP (post-fetch keyword filter on title+text)
FMP returns financial news for major tickers (JPM, GS, MSFT, AAPL, BRK.B etc.).
We filter those articles by checking if your keywords appear in the title or body.
So these are FILTER KEYWORDS, not search queries.
- 1-2 words each, must appear in real financial news text
- Good: "earnings", "audit", "restatement", "GAAP", "IFRS", "SEC filing", "writedown", "impairment"
- Bad: "financial reporting standards" (too long, won't match)
Generate: 6 FMP filter keywords`,

  // ── Electrical Engineer ───────────────────────────────────────────────────

  newsData: `
━━ NEWSDATA.IO (/latest?q=QUERY&category=technology,science)
Searches technology and science news headlines and descriptions. Works with:
- Engineering discipline + application: "power electronics inverter", "FPGA embedded systems"
- Industry vertical: "EV battery technology", "smart grid infrastructure", "5G antenna"
- Component/material level: "semiconductor gallium nitride", "lithium iron phosphate"
- 2-5 words, technical but recognisable in trade press headlines
Generate: 3 NewsData queries`,

};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA BUILDER
// Only includes the fields relevant to the slug — keeps prompt focused
// ═══════════════════════════════════════════════════════════════════════════════

function buildSchema(slug) {
   const guardianBlock = `
  "guardian": {
    "category1": ["word1", "word2", "word3", "word4", "word5"],
    "category2": ["phrase one", "phrase two", "phrase three", "phrase four", "phrase five"]
  }`;

  const newsApiBlock = `
  "newsApi": {
    "category1": ["word1", "word2", "word3", "word4", "word5"],
    "category2": ["phrase one", "phrase two", "phrase three", "phrase four", "phrase five"]
  }`;

  const lines = ['{', guardianBlock + ',', newsApiBlock];

  if (is.softwareEngineer(slug)) {
    lines.push('  ,"devTo":      ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]');
    lines.push('  ,"hackerNews": ["query1", "query2", "query3", "query4"]');
  }
  if (is.lawyer(slug)) {
    lines.push('  ,"courtListener":   ["query1", "query2", "query3"]');
    lines.push('  ,"federalRegister": ["query1", "query2", "query3"]');
  }
  if (is.accountant(slug)) {
    lines.push('  ,"fmp":             ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"]');
    lines.push('  ,"federalRegister": ["query1", "query2", "query3"]');
  }
  if (is.electricalEngineer(slug)) {
    lines.push('  ,"newsData": ["query1", "query2", "query3"]');
  }

  lines.push('}');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTION ASSEMBLER
// Only sends the instruction blocks relevant to this profession
// ═══════════════════════════════════════════════════════════════════════════════

function buildInstructions(slug, profession) {
  const blocks = [
    INSTRUCTIONS.guardian.replace(/\${profession}/g, profession),
    INSTRUCTIONS.newsApi.replace(/\${profession}/g, profession),
  ];

  if (is.softwareEngineer(slug)) {
    blocks.push(INSTRUCTIONS.devTo.replace(/\${profession}/g, profession));
    blocks.push(INSTRUCTIONS.hackerNews);
  }

  if (is.lawyer(slug)) {
    blocks.push(INSTRUCTIONS.courtListener);
    blocks.push(INSTRUCTIONS.federalRegister);
  }

  if (is.accountant(slug)) {
    blocks.push(INSTRUCTIONS.fmp);
    blocks.push(INSTRUCTIONS.federalRegister);
  }

  if (is.electricalEngineer(slug)) {
    blocks.push(INSTRUCTIONS.newsData);
  }

  return blocks.join('\n');
}


function normalise(parsed, slug) {
  if (!parsed?.guardian?.category1 || !parsed?.newsApi?.category1) {
    const err = new Error('Gemini returned invalid topic format — missing category1');
    err.status = 502;
    throw err;
  }

  return {
    guardian: {
      category1: parsed.guardian.category1.slice(0, 5),
      category2: (parsed.guardian.category2 || []).slice(0, 5),
    },
    newsApi: {
      category1: parsed.newsApi.category1.slice(0, 5),
      category2: (parsed.newsApi.category2 || []).slice(0, 5),
    },
    devTo:           is.softwareEngineer(slug) ? (parsed.devTo      || []).slice(0, 6) : null,
    hackerNews:      is.softwareEngineer(slug) ? (parsed.hackerNews || []).slice(0, 4) : null,
    courtListener:   is.lawyer(slug)           ? (parsed.courtListener   || []).slice(0, 3) : null,
    federalRegister: (is.lawyer(slug) || is.accountant(slug))
                                               ? (parsed.federalRegister || []).slice(0, 3) : null,
    fmp:             is.accountant(slug)        ? (parsed.fmp        || []).slice(0, 6) : null,
    newsData:        is.electricalEngineer(slug)? (parsed.newsData   || []).slice(0, 3) : null,
    who:             null,
    cdc:             null,
  };
}

async function generateApiSpecificTopics(profession, slug, cvContext = null) {
  if (!profession || typeof profession !== 'string') {
    const err = new Error('profession is required');
    err.status = 400;
    throw err;
  }

  const cvHint = cvContext?.topics?.length
    ? `\nThis user's CV highlights these specific expertise areas: ${cvContext.topics.slice(0, 8).join(', ')}. Weight your terms toward these where relevant.\n`
    : '';

  const instructions = buildInstructions(slug, profession);
  const schema       = buildSchema(slug);

  const prompt = `You are a search query specialist generating optimised search terms for a ${profession}.${cvHint}

Each API below has a different query model. Read each section carefully and generate terms that match how that API actually works.

${instructions}

══════════════════════════════════════
OUTPUT
══════════════════════════════════════
Return ONLY valid JSON matching this exact schema. No markdown fences, no explanation, no extra keys.

${schema}

GLOBAL RULES:
- Every term must be directly relevant to a ${profession}'s professional work
- Do not repeat the same concept across different API sections
- Do not use generic filler words: "news", "update", "latest", "trends", "industry", "professional"
- Prefer specificity: named tools, named regulations, named events, named organisations
${cvContext ? '- Prioritise the CV expertise areas listed above when choosing terms' : ''}`;

  const text   = await callGemini(prompt);
  const parsed = parseJSON(text);

  return normalise(parsed, slug);
}

module.exports = { generateApiSpecificTopics };
