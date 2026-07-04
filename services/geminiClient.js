const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY environment variable is not set');

// v1beta required for gemini-2.5-flash and other recent models.
// Do not switch to v1 unless you've confirmed your model is available there.
const geminiClient = axios.create({
  baseURL:
    process.env.GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta',
  timeout: 1800000, // generous — covers both small Q&A calls and large categorization batches
  params: { key: GEMINI_API_KEY },
});
// ─── Rate gate baked into the client itself ───────────────────────────────────
// Every call through geminiClient automatically waits for a slot — callers
// don't need to remember to call anything before making a request.
const MIN_GEMINI_GAP_MS = 4500; // tune to 60000 / your_actual_RPM
let lastGeminiCall = 0;

geminiClient.interceptors.request.use(async (config) => {
  const elapsed = Date.now() - lastGeminiCall;
  if (elapsed < MIN_GEMINI_GAP_MS) {
    const waitMs = MIN_GEMINI_GAP_MS - elapsed;
    console.log(`[GeminiGate] Waiting ${waitMs}ms for rate slot...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastGeminiCall = Date.now();
  return config;
});

module.exports = { geminiClient };