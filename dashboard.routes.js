const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Thin wrapper around jsonwebtoken. Isolating this behind a small utility
 * means the auth service and middleware never talk to the `jsonwebtoken`
 * library directly — if we ever swapped JWT libraries, only this file
 * would change (Dependency Inversion in miniature).
 */
function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
