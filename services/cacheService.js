// const Cache = require('../models/cacheModel');

// const CACHE_TTL_HOURS = 24;

// function buildKey(type, profession) {
//   return `${type}:${profession.toLowerCase().trim()}`;
// }

// function getExpiresAt() {
//   const d = new Date();
//   d.setHours(d.getHours() + CACHE_TTL_HOURS);
//   return d;
// }

// // ─── Get from cache ───────────────────────────────────────────────────────────

// async function getCache(type, profession) {
//   try {
//     const key = buildKey(type, profession);
//     const cached = await Cache.findOne({ key });

//     if (!cached) {
//       console.log(`[Cache MISS] ${key}`);
//       return null;
//     }

//     console.log(`[Cache HIT] ${key}`);
//     return cached.data;
//   } catch (error) {
//     // Never let cache errors crash the app — just fetch fresh
//     console.error('[Cache] getCache error:', error.message);
//     return null;
//   }
// }

// // ─── Set cache ────────────────────────────────────────────────────────────────

// async function setCache(type, profession, data, meta = {}) {
//   try {
//     const key = buildKey(type, profession);

//     await Cache.findOneAndUpdate(
//       { key },
//       {
//         key,
//         profession: profession.toLowerCase().trim(),
//         type,
//         data,
//         expiresAt: getExpiresAt(),
//         meta: {
//           ...meta,
//           cachedAt: new Date(),
//         },
//       },
//       { upsert: true, new: true },
//     );

//     console.log(`[Cache SET] ${key}`);
//   } catch (error) {
//     // Never let cache errors crash the app
//     console.error('[Cache] setCache error:', error.message);
//   }
// }

// // ─── Check if cache exists and is valid ──────────────────────────────────────

// async function isCached(type, profession) {
//   try {
//     const key = buildKey(type, profession);
//     const exists = await Cache.exists({ key });
//     return !!exists;
//   } catch {
//     return false;
//   }
// }

// // ─── Invalidate cache ─────────────────────────────────────────────────────────

// async function invalidateCache(type, profession) {
//   try {
//     const key = buildKey(type, profession);
//     await Cache.deleteOne({ key });
//     console.log(`[Cache INVALIDATED] ${key}`);
//   } catch (error) {
//     console.error('[Cache] invalidateCache error:', error.message);
//   }
// }

// module.exports = {
//   getCache,
//   setCache,
//   isCached,
//   invalidateCache,
// };

const Cache = require('../models/cacheModel');

const CACHE_TTL_HOURS = 24;

function buildSharedKey(type, profession) {
  return `${type}:${profession.toLowerCase().trim()}`;
}

function buildPersonalKey(type, userId) {
  return `${type}:user:${userId.toString()}`;
}

function getExpiresAt(hours = CACHE_TTL_HOURS) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ─── Shared cache (profession-level) ─────────────────────────────────────────

async function getCache(type, profession) {
  try {
    const key = buildSharedKey(type, profession);
    const cached = await Cache.findOne({ key });
    if (!cached) {
      console.log(`[Cache MISS] ${key}`);
      return null;
    }
    console.log(`[Cache HIT] ${key}`);
    return cached.data;
  } catch (error) {
    console.error('[Cache] getCache error:', error.message);
    return null;
  }
}

async function setCache(type, profession, data, meta = {}) {
  try {
    const key = buildSharedKey(type, profession);
    await Cache.findOneAndUpdate(
      { key },
      {
        key,
        profession: profession.toLowerCase().trim(),
        type,
        cacheType: 'shared',
        data,
        expiresAt: getExpiresAt(),
        meta: { ...meta, cachedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    console.log(`[Cache SET] ${key}`);
  } catch (error) {
    console.error('[Cache] setCache error:', error.message);
  }
}

async function isCached(type, profession) {
  try {
    const key = buildSharedKey(type, profession);
    const exists = await Cache.exists({ key });
    return !!exists;
  } catch {
    return false;
  }
}

// ─── Personal cache (user-level) ─────────────────────────────────────────────

async function getPersonalCache(type, userId) {
  try {
    const key = buildPersonalKey(type, userId);
    const cached = await Cache.findOne({ key });
    if (!cached) {
      console.log(`[PersonalCache MISS] ${key}`);
      return null;
    }
    console.log(`[PersonalCache HIT] ${key}`);
    return cached.data;
  } catch (error) {
    console.error('[Cache] getPersonalCache error:', error.message);
    return null;
  }
}

async function setPersonalCache(type, userId, data, meta = {}) {
  try {
    const key = buildPersonalKey(type, userId);
    await Cache.findOneAndUpdate(
      { key },
      {
        key,
        userId,
        type,
        cacheType: 'personal',
        data,
        expiresAt: getExpiresAt(),
        meta: { ...meta, cachedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    console.log(`[PersonalCache SET] ${key}`);
  } catch (error) {
    console.error('[Cache] setPersonalCache error:', error.message);
  }
}

async function invalidatePersonalCache(userId) {
  try {
    await Cache.deleteMany({ userId, cacheType: 'personal' });
    console.log(`[PersonalCache INVALIDATED] user:${userId}`);
  } catch (error) {
    console.error('[Cache] invalidatePersonalCache error:', error.message);
  }
}

async function invalidateCache(type, profession) {
  try {
    const key = buildSharedKey(type, profession);
    await Cache.deleteOne({ key });
    console.log(`[Cache INVALIDATED] ${key}`);
  } catch (error) {
    console.error('[Cache] invalidateCache error:', error.message);
  }
}
module.exports = {
  getCache,
  setCache,
  isCached,
  invalidateCache,
  getPersonalCache,
  setPersonalCache,
  
  invalidatePersonalCache,
};