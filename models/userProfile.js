const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one profile per user
      index: true,
    },
    // ── Extracted from CV ─────────────────────────────────────────────────
    name: { type: String, default: null },
    roles: [{ type: String }],
    skills: [{ type: String }],
    experienceLevel: {
      type: String,
      enum: ['Junior', 'Intermediate', 'Senior', 'Lead', 'Executive', null],
      default: null,
    },
    domains: {
      primary: { type: String, default: null },
      secondary: [{ type: String }],
    },
    location: { type: String, default: null },   // country discovered from CV
    preferredJobType: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid', 'any', null],
      default: 'any',
    },
    // ── Generated keywords ────────────────────────────────────────────────
    keywords: {
      news: [{ type: String }],
      books: [{ type: String }],
      jobs: [{ type: String }],
    },
    // ── Status ────────────────────────────────────────────────────────────
    isComplete: { type: Boolean, default: false }, // true after CV uploaded
    lastAnalyzedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserProfile', userProfileSchema);