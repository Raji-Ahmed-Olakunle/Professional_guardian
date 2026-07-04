
const MIN_NEWSDATA_GAP_MS = 2500; // ~24 calls per 15 min ceiling — safe margin under 30

let lastNewsDataCall = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNewsDataSlot() {
  const elapsed = Date.now() - lastNewsDataCall;
  if (elapsed < MIN_NEWSDATA_GAP_MS) {
    await sleep(MIN_NEWSDATA_GAP_MS - elapsed);
  }
  lastNewsDataCall = Date.now();
}

module.exports = { waitForNewsDataSlot };