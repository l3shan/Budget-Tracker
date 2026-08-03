const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * Centralized error handler — the single place in the app that turns any
 * thrown error into an HTTP response. Controllers/services never format
 * error responses themselves; they just throw `ApiError` (or let unexpected
 * errors bubble up) and this middleware does the rest.
 *
 * Must be registered LAST, after all routes, per Express convention
 * (4-argument signature is what marks it as an error handler).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || undefined,
    });
  }

  // MySQL duplicate-entry / FK violations that slipped past service-level checks.
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A record with these values already exists' });
  }

  // Unexpected/programmer error: log full detail server-side, hide it from the client.
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.isProduction ? {} : { debug: err.message }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

module.exports = { errorHandler, notFoundHandler };
