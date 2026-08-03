const bcrypt = require('bcrypt');
const env = require('../config/env');

/** Hash a plaintext password for storage. Never store plaintext passwords. */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcrypt.saltRounds);
}

/** Compare a plaintext password against a stored bcrypt hash. */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, comparePassword };
