// db.js — SQLite database setup for BudgetBuddy.
// Uses better-sqlite3: a synchronous, embedded SQLite driver (no separate DB server needed).
// The database lives in a single file: budgetbuddy.db, created automatically on first run.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'budgetbuddy.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    currency      TEXT NOT NULL DEFAULT 'KSh',
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    description TEXT,
    amount      REAL NOT NULL,
    category    TEXT,
    date        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

  CREATE TABLE IF NOT EXISTS budgets (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL,
    amount      REAL NOT NULL,
    description TEXT,
    PRIMARY KEY (user_id, category)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id       TEXT PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name     TEXT NOT NULL,
    target   REAL NOT NULL,
    saved    REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
`);

module.exports = db;
