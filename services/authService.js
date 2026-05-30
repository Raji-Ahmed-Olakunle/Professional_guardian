const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET is not set');
    err.status = 500;
    throw err;
  }

  return jwt.sign(
    { id: user._id.toString(), username: user.username, profession: user.profession },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    profession: user.profession,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function signup({ username, password, profession }) {
  if (!username || !password || !profession) {
    const err = new Error('username, password, and profession are required');
    err.status = 400;
    throw err;
  }

  const existing = await User.findOne({ username });
  if (existing) {
    const err = new Error('Username already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: passwordHash, profession });

  return { user: toSafeUser(user), token: generateToken(user) };
}

async function login({ username, password }) {
  if (!username || !password) {
    const err = new Error('username and password are required');
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ username });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  return { user: toSafeUser(user), token: generateToken(user) };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return toSafeUser(user);
}

module.exports = {
  signup,
  login,
  getMe,
};

