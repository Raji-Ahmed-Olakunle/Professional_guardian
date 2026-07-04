const { fetchFreshNews } = require('./newsService');
const { fetchFreshBooks } = require('./bookService');
const { isCached } = require('./cacheService');

// The 5 professions your app supports
const SUPPORTED_PROFESSIONS = [
  'software engineer',
  'Nurse',
  'Accountant',
  'Lawyer',
  'Electrical Engineer',
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function preloadProfession(profession) {
  console.log(`[Preloader] Starting preload for: ${profession}`);

  const [newsAlreadyCached, booksAlreadyCached] = await Promise.all([
    isCached('news', profession),
    isCached('books', profession),
  ]);

  const tasks = [];

  if (!newsAlreadyCached) {
    console.log(`[Preloader] Fetching fresh news for: ${profession}`);
    tasks.push(
      withTimeout(fetchFreshNews(profession), 240000, `news:${profession}`),
    );
  } else {
    console.log(`[Preloader] News cache valid for: ${profession} — skipping`);
  }

  if (!booksAlreadyCached) {
    console.log(`[Preloader] Fetching fresh books for: ${profession}`);
    tasks.push(
      withTimeout(fetchFreshBooks(profession), 120000, `books:${profession}`),
    );
  } else {
    console.log(`[Preloader] Books cache valid for: ${profession} — skipping`);
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(
        `[Preloader] Failed for ${profession}:`,
        result.reason?.message,
      );
    }
  });

  console.log(`[Preloader] Done for: ${profession}`);
}

// Timeout wrapper — rejects if fn takes longer than ms
function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`[${label}] Timed out after ${ms / 1000}s`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
}

async function preloadAllProfessions() {
  console.log('[Preloader] Starting cache preload for all professions...');

  // Preload professions sequentially to avoid hammering APIs
  for (const profession of SUPPORTED_PROFESSIONS) {
    // console.log('[Preloader] Waiting 40s before next profession...');
    // await sleep(5000);
    await preloadProfession(profession);
  }

  console.log('[Preloader] All professions preloaded successfully');
}
module.exports = { preloadAllProfessions, SUPPORTED_PROFESSIONS };