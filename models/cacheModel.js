// const mongoose = require('mongoose');

// const cacheSchema = new mongoose.Schema(
//   {
//     // e.g. "news:software engineer" or "books:software engineer"
//     key: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true,
//     },
//     profession: {
//       type: String,
//       required: true,
//     },
//     type: {
//       type: String,
//       enum: ['news', 'books'],
//       required: true,
//     },
//     data: {
//       type: mongoose.Schema.Types.Mixed,
//       required: true,
//     },
//     // Atlas TTL index — MongoDB auto-deletes document after 24h
//     expiresAt: {
//       type: Date,
//       required: true,
//       index: { expireAfterSeconds: 0 },
//     },
//     // Metadata — useful for debugging via Atlas UI
//     meta: {
//       fetchDurationMs: Number,
//       articleCount: Number,
//       bookCount: Number,
//       cachedAt: Date,
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// module.exports = mongoose.model('Cache', cacheSchema);

const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    profession: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // 'shared' = profession-level cache, 'personal' = user-level cache
    cacheType: {
      type: String,
      enum: ['shared', 'personal'],
      default: 'shared',
    },
    type: {
      type: String,
      enum: ['news', 'books', 'jobs'],
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    meta: {
      fetchDurationMs: Number,
      articleCount: Number,
      bookCount: Number,
      jobCount: Number,
      cachedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Cache', cacheSchema);