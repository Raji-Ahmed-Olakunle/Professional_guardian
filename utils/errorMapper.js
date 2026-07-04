// utils/errorMapper.js
'use strict';

// ─── External API host → friendly service name ────────────────────────────────

const HOST_TO_SERVICE = {
  'generativelanguage.googleapis.com': 'Gemini',
  'googleapis.com':                    'Gemini',
  'jsearch.p.rapidapi.com':            'Job Search',
  'newsapi.org':                       'News API',
  'content.guardianapis.com':          'The Guardian',
  'openlibrary.org':                   'Open Library',
  'www.googleapis.com':                'Google Books',
  'courtlistener.com':                 'CourtListener',
  'www.courtlistener.com':             'CourtListener',
  'financialmodelingprep.com':         'Financial Data',
  'newsdata.io':                       'NewsData',
  'www.who.int':                       'WHO',
  'tools.cdc.gov':                     'CDC',
  'www.federalregister.gov':           'Federal Register',
  'hn.algolia.com':                    'Hacker News',
  'dev.to':                            'Dev.to',
};

// ─── Per-service status code messages ────────────────────────────────────────

const SERVICE_STATUS_MESSAGES = {
  Gemini: {
    400: 'Gemini rejected the request — the prompt may be too long or malformed.',
    401: 'Gemini API key is invalid or missing.',
    403: 'Gemini API key does not have permission for this operation.',
    429: 'Gemini rate limit reached. Please wait a moment and try again.',
    500: 'Gemini encountered an internal error. Try again shortly.',
    503: 'Gemini is temporarily unavailable. Try again shortly.',
  },
  'Job Search': {
    401: 'Job search API key is invalid.',
    403: 'Job search API access denied — check your RapidAPI subscription.',
    429: 'Job search rate limit reached. Please try again later.',
    503: 'Job search service is temporarily unavailable.',
  },
  'News API': {
    401: 'News API key is invalid or missing.',
    429: 'News API rate limit reached. Please try again later.',
    426: 'News API free tier limit reached for this endpoint.',
  },
  'The Guardian': {
    401: 'Guardian API key is invalid.',
    429: 'Guardian API rate limit reached.',
  },
  'Open Library': {
    429: 'Open Library rate limit reached. Please try again later.',
    503: 'Open Library is temporarily unavailable.',
  },
  'Google Books': {
    403: 'Google Books API quota exceeded or access denied.',
    429: 'Google Books rate limit reached.',
  },
  CourtListener: {
    401: 'CourtListener API token is invalid.',
    429: 'CourtListener rate limit reached.',
  },
  'Financial Data': {
    401: 'Financial data API key is invalid.',
    429: 'Financial data rate limit reached. Free tier may be exhausted for today.',
  },
  NewsData: {
    401: 'NewsData API key is invalid.',
    429: 'NewsData rate limit reached. Daily credit limit may be exhausted.',
  },
};

// ─── Generic HTTP status messages ────────────────────────────────────────────

const GENERIC_STATUS_MESSAGES = {
  400: 'Bad request — the server could not process this input.',
  401: 'Authentication failed. Please log in again.',
  403: 'You do not have permission to access this resource.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred — this resource may already exist.',
  422: 'The server could not process the provided data.',
  429: 'Too many requests. Please slow down and try again.',
  500: 'An internal server error occurred. Please try again.',
  502: 'A required service is temporarily unavailable. Please try again shortly.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'The request timed out waiting for an upstream service.',
};

// ─── Axios network error messages ─────────────────────────────────────────────

const AXIOS_NETWORK_MESSAGES = {
  ECONNREFUSED: (s) => `Could not connect to ${s || 'an external service'} — connection refused.`,
  ECONNRESET:   (s) => `Connection to ${s || 'an external service'} was reset unexpectedly.`,
  ETIMEDOUT:    (s) => `Request to ${s || 'an external service'} timed out.`,
  ENOTFOUND:    (s) => `Could not reach ${s || 'an external service'} — DNS lookup failed.`,
  ECONNABORTED: (s) => `Request to ${s || 'an external service'} was aborted (timeout).`,
  ERR_CANCELED: (s) => `Request to ${s || 'an external service'} was cancelled.`,
};

// ─── MongoDB connection error fingerprints ────────────────────────────────────
// These cover every error Mongoose/MongoDB driver throws when the connection
// drops mid-request (TLS drop, socket close, topology destroyed, etc.)

const DB_ERROR_NAMES = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoTopologyClosedError',
  'MongoExpiredSessionError',
]);

const DB_ERROR_SUBSTRINGS = [
  'client network socket disconnected',
  'connection closed',
  'connection reset',
  'server selection timed out',
  'topology was destroyed',
  'tls',
  'ssl handshake',
  'secureconnect',
  'econnreset',
  'econnrefused',
  'socket hang up',
  'monitor',
];

// ─── PDF / OCR errors ─────────────────────────────────────────────────────────
// Thrown by cvService — pdf-parse or Tesseract failures

const PDF_ERROR_SUBSTRINGS = [
  'invalid pdf',
  'pdf parse',
  'unreadable',
  'ocr',
  'pdf structure',
  'failed to parse pdf',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectServiceFromAxiosError(err) {
  try {
    const url = err.config?.url || err.request?._currentUrl || '';
    const host = new URL(url).hostname;
    return HOST_TO_SERVICE[host] || null;
  } catch {
    return null;
  }
}

function getStatusMessage(service, statusCode) {
  const serviceMessages = SERVICE_STATUS_MESSAGES[service] || {};
  return (
    serviceMessages[statusCode] ||
    GENERIC_STATUS_MESSAGES[statusCode] ||
    `Unexpected error (HTTP ${statusCode}).`
  );
}

function isDbError(err) {
  if (DB_ERROR_NAMES.has(err.name)) return true;
  if (!err.message) return false;
  const lower = err.message.toLowerCase();
  return DB_ERROR_SUBSTRINGS.some((s) => lower.includes(s));
}

function isPdfError(err) {
  if (!err.message) return false;
  const lower = err.message.toLowerCase();
  return PDF_ERROR_SUBSTRINGS.some((s) => lower.includes(s));
}

// ─── Main classifier ──────────────────────────────────────────────────────────

function classifyError(err) {

  // ── 1. Axios errors (external API calls) ─────────────────────────────────
  if (err.isAxiosError || err.config?.url) {
    const service      = detectServiceFromAxiosError(err);
    const serviceLabel = service || 'an external service';

    if (!err.response) {
      // Network-level failure — no response received
      const networkCode = err.code || '';
      const messageFn   = AXIOS_NETWORK_MESSAGES[networkCode];
      if (messageFn) {
        return { status: 502, message: messageFn(serviceLabel), code: 'EXTERNAL_NETWORK_ERROR' };
      }
      if (err.message?.toLowerCase().includes('timeout')) {
        return { status: 504, message: `Request to ${serviceLabel} timed out. Please try again.`, code: 'EXTERNAL_TIMEOUT' };
      }
      return { status: 502, message: `Could not reach ${serviceLabel}. Please try again shortly.`, code: 'EXTERNAL_UNAVAILABLE' };
    }

    // HTTP error response from the external API
    const statusCode = err.response.status;
    return {
      status:  statusCode >= 500 ? 502 : statusCode,
      message: getStatusMessage(service, statusCode),
      code:    statusCode === 429 ? 'RATE_LIMITED' : 'EXTERNAL_API_ERROR',
    };
  }

  // ── 2. MongoDB / Mongoose connection errors ───────────────────────────────
  // Must come BEFORE the err.status check because Mongoose connection errors
  // don't have err.status set and would otherwise fall through to the generic
  // fallback, producing a misleading APP_ERROR or INTERNAL_ERROR code.
  if (isDbError(err)) {
    return {
      status:  503,
      message: 'The service is temporarily unavailable. Please try again in a moment.',
      code:    'DB_CONNECTION_ERROR',
    };
  }

  // ── 3. Multer errors (file upload) ────────────────────────────────────────
  // MulterError objects (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, etc.)
  if (err.name === 'MulterError') {
    const multerMessages = {
      LIMIT_FILE_SIZE:       'File is too large. Maximum allowed size is 10MB.',
      LIMIT_FILE_COUNT:      'Too many files uploaded at once.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field in upload request.',
      LIMIT_PART_COUNT:      'Too many parts in the upload request.',
      LIMIT_FIELD_KEY:       'Field name is too long.',
      LIMIT_FIELD_VALUE:     'Field value is too long.',
      LIMIT_FIELD_COUNT:     'Too many fields in the upload request.',
    };
    return {
      status:  400,
      message: multerMessages[err.code] || err.message || 'File upload error.',
      code:    err.code || 'UPLOAD_ERROR',
    };
  }

  // Plain Error from multer fileFilter: cb(new Error('Only PDF files are supported'), false)
  // Multer strips err.status from these — detect by message content.
  if (
    err.message?.toLowerCase().includes('only pdf') ||
    err.message?.toLowerCase().includes('pdf files are supported') ||
    err.message?.toLowerCase().includes('file type') ||
    err.message?.toLowerCase().includes('file upload failed')
  ) {
    return { status: 400, message: err.message, code: 'INVALID_FILE_TYPE' };
  }

  // ── 4. PDF parsing / OCR errors (cvService) ───────────────────────────────
  // pdf-parse throws when PDF is corrupted, encrypted, or malformed.
  // Tesseract throws when OCR fails entirely.
  // cvService already sets err.status = 400 for known cases, but pdf-parse
  // itself throws plain errors without err.status.
  if (isPdfError(err)) {
    return {
      status:  400,
      message: err.message || 'Could not read the PDF file. Please ensure it is a valid, unencrypted PDF.',
      code:    'PDF_PARSE_ERROR',
    };
  }

  // ── 5. Manually thrown errors with err.status set ────────────────────────
  // Standard pattern used throughout your services:
  //   const err = new Error('Invalid credentials'); err.status = 401; throw err;
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    return {
      status,
      message: err.message || GENERIC_STATUS_MESSAGES[status] || 'An error occurred.',
      code:    err.code || 'APP_ERROR',
    };
  }

  // ── 6. Mongoose schema / validation errors ────────────────────────────────
  if (err.name === 'ValidationError') {
    const fields = Object.keys(err.errors || {}).join(', ');
    return {
      status:  400,
      message: `Validation failed${fields ? ` for: ${fields}` : ''}.`,
      code:    'VALIDATION_ERROR',
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return {
      status:  409,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`,
      code:    'DUPLICATE_KEY',
    };
  }

  if (err.name === 'CastError') {
    return { status: 400, message: 'Invalid ID format.', code: 'INVALID_ID' };
  }

  // ── 7. JWT errors ─────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Invalid token. Please log in again.', code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Your session has expired. Please log in again.', code: 'TOKEN_EXPIRED' };
  }

  // ── 8. Fallback ───────────────────────────────────────────────────────────
  // Surface err.message if it looks user-facing (short, no stack internals).
  // This catches any thrown Error without err.status that slipped through —
  // e.g. a plain `throw new Error('Something went wrong')` without err.status.
  const isUserFacingMessage =
    err.message &&
    err.message.length < 200 &&
    !err.message.includes(' at ') &&
    !err.message.includes('node_modules') &&
    !err.message.includes('/home/') &&
    !err.message.includes('\\Users\\');

  return {
    status:  500,
    message: isUserFacingMessage
      ? err.message
      : 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
  };
}

module.exports = { classifyError };