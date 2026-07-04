











































































































const Cache = require('../models/cacheModel');
const mongoose = require('mongoose');

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





function isDbAvailable() {
  return mongoose.connection.readyState === 1;
}



async function getCache(type, profession) {
  if (!isDbAvailable()) {
    console.warn(`[Cache] DB unavailable — skipping getCache for ${type}:${profession}`);
    return null;
  }
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
  if (!isDbAvailable()) {
    console.warn(`[Cache] DB unavailable — skipping setCache for ${type}:${profession}`);
    return; 
  }
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
  if (!isDbAvailable()) return false;
  try {
    const key = buildSharedKey(type, profession);
    const exists = await Cache.exists({ key });
    return !!exists;
  } catch {
    return false;
  }
}



async function getPersonalCache(type, userId) {
  if (!isDbAvailable()) {
    console.warn(`[Cache] DB unavailable — skipping getPersonalCache for ${type}:${userId}`);
    return null;
  }
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
  if (!isDbAvailable()) {
    console.warn(`[Cache] DB unavailable — skipping setPersonalCache for ${type}:${userId}`);
    return;
  }
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
  if (!isDbAvailable()) {
    console.warn(`[Cache] DB unavailable — skipping invalidatePersonalCache for user:${userId}`);
    return;
  }
  try {
    await Cache.deleteMany({ userId, cacheType: 'personal' });
    console.log(`[PersonalCache INVALIDATED] user:${userId}`);
  } catch (error) {
    console.error('[Cache] invalidatePersonalCache error:', error.message);
  }
}

async function invalidateCache(type, profession) {
  if (!isDbAvailable()) return;
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
  isDbAvailable,
};