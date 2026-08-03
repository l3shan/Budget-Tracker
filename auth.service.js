/**
 * MySQL connection pool.
 *
 * A single pool is created and shared across the whole application
 * (composition-root style singleton), instead of every repository opening
 * its own connection. This keeps resource usage predictable and is the
 * conventional pattern for mysql2 in a long-running Express process.
 */

const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
});

/** Simple helper used at startup to verify the DB is reachable. */
async function checkConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}

module.exports = { pool, checkConnection };
