const pdfParse = require('pdf-parse');
const { extractCvProfile } = require('./geminiService');
const UserProfile = require('../models/UserProfile');
const Tesseract = require('tesseract.js');
const { fromBuffer } = require('pdf2pic');

async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text?.trim() || '';
}
async function runOCR(buffer) {
  const convert = fromBuffer(buffer, {
    density: 200,
    format: "png",
    width: 1200,
    height: 1600,
  });

  let fullText = '';

  const pages = await convert.bulk(-1, true);

  for (const page of pages) {
    const result = await Tesseract.recognize(page.path, 'eng');
    fullText += '\n' + result.data.text;
  }

  return fullText.trim();
}
function isTextValid(text) {
  if (!text) return false;

  // minimum useful length
  if (text.length < 200) return false;

  // avoid garbage OCR noise
  const words = text.split(/\s+/).length;
  if (words < 50) return false;

  return true;
}
function cleanCvText(text) {
  return text
    .replace(/\s+/g, ' ')                 // normalize spaces
    .replace(/[^a-zA-Z0-9@.,+\-#\s]/g, '') // remove weird symbols
    .replace(/\bPage \d+\b/gi, '')        // remove page numbers
    .trim();
}
async function extractCvText(buffer) {
  // 1. Try normal parsing
  let text = await extractTextFromPdf(buffer);

  console.log("PDF PARSE LENGTH:", text.length);

  // 2. If weak → OCR
  if (!isTextValid(text)) {
    console.log("Switching to OCR...");
    text = await runOCR(buffer);
  }

  // 3. Clean text
  text = cleanCvText(text);

  // Final validation
  if (!isTextValid(text)) {
    const err = new Error("CV unreadable even after OCR");
    err.status = 400;
    throw err;
  }

  return text;
}
// async function parsePdfToText(buffer) {
//   try {
//     const data = await pdfParse(buffer);
//     const text = data.text?.trim();
//     if (!text || text.length < 50) {
//       const err = new Error('CV appears to be empty or unreadable');
//       err.status = 400;
//       throw err;
//     }
//     return text;
//   } catch (error) {
//     if (error.status === 400) throw error;
//     const err = new Error('Failed to parse PDF — ensure the file is not scanned/image-only');
//     err.status = 400;
//     throw err;
//   }
// }


async function processCv(userId, profession, pdfBuffer) {
  // Step 1 — extract text
 const cvText = await extractCvText(pdfBuffer);

  // Step 2 — Gemini extraction
  const extracted = await extractCvProfile(cvText, profession);

  // Step 3 — upsert profile (one per user)
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      userId,
      name: extracted.name,
      roles: extracted.roles || [],
      skills: extracted.skills || [],
      experienceLevel: extracted.experience_level || null,
      domains: {
        primary: extracted.domains?.primary || null,
        secondary: extracted.domains?.secondary || [],
      },
      location: extracted.location || null,
      preferredJobType: extracted.preferred_job_type || 'any',
      keywords: {
        news: extracted.keywords?.news || [],
        books: extracted.keywords?.books || [],
        jobs: extracted.keywords?.jobs || [],
      },
      isComplete: true,
      lastAnalyzedAt: new Date(),
    },
    { upsert: true, new: true, returnDocument: 'after' },
  );

  return toSafeProfile(profile);
}

/**
 * Get existing profile for a user
 */
async function getProfile(userId) {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) return null;
  return toSafeProfile(profile);
}

/**
 * Manually update specific fields (user edits)
 */
async function updateProfile(userId, updates) {
  const allowed = [
    'name', 'roles', 'skills', 'experienceLevel',
    'domains', 'location', 'preferredJobType', 'keywords',
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) sanitized[key] = updates[key];
  }

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: sanitized },
    { new: true, returnDocument: 'after' },
  );

  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  return toSafeProfile(profile);
}
function toSafeProfile(profile) {
  return {
    name: profile.name,
    roles: profile.roles,
    skills: profile.skills,
    experienceLevel: profile.experienceLevel,
    domains: profile.domains,
    location: profile.location,
    preferredJobType: profile.preferredJobType,
    keywords: profile.keywords,
    isComplete: profile.isComplete,
    lastAnalyzedAt: profile.lastAnalyzedAt,
  };
}

module.exports = { processCv, getProfile, updateProfile };