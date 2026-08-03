const { verifyToken } = require('../utils/jwt.util');
const ApiError = require('../utils/ApiError');

/**
 * Protects a route: requires a valid `Authorization: Bearer <token>` header.
 * On success, attaches `req.user = { id, email }` so downstream controllers
 * know who is making the request without re-parsing the token themselves.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

module.exports = requireAuth;
