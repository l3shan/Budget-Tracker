/**
 * Centralized configuration module.
 *
 * Design principle demonstrated: Configuration Management.
 * Nothing in the rest of the codebase reads `process.env` directly — every
 * other module imports from here. This means:
 *   1. There is a single source of truth for configuration.
 *   2. Swapping the config source (e.g. to a secrets manager) only requires
 *      changing this one file.
 *   3. Missing/invalid required variables fail fast, at startup, instead of
 *      causing confusing runtime errors deep inside a request.
 */

require('dotenv').config();

function requireEnv(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const env = {
  nodeEnv: requireEnv('NODE_ENV', 'development'),
  port: Number(requireEnv('PORT', '5000')),

  db: {
    host: requireEnv('DB_HOST', 'localhost'),
    port: Number(requireEnv('DB_PORT', '3306')),
    user: requireEnv('DB_USER', 'root'),
    password: requireEnv('DB_PASSWORD', ''),
    database: requireEnv(
      'DB_NAME',
      process.env.NODE_ENV === 'test' ? 'student_budget_planner_test' : 'student_budget_planner'
    ),
    connectionLimit: Number(requireEnv('DB_CONNECTION_LIMIT', '10')),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev_only_secret_change_me'),
    expiresIn: requireEnv('JWT_EXPIRES_IN', '1d'),
  },

  bcrypt: {
    saltRounds: Number(requireEnv('BCRYPT_SALT_ROUNDS', '10')),
  },

  cors: {
    origin: requireEnv('CORS_ORIGIN', '*'),
  },

  isTest: (process.env.NODE_ENV || 'development') === 'test',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;
