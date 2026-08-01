// server.js — BudgetBuddy backend
// Express REST API backed by SQLite (via better-sqlite3). Serves the frontend
// from /public and exposes /api/* endpoints for auth, transactions, budgets, and goals.

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'budgetbuddy-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function publicUser(row) {
  if (!row) return null;
  return { username: row.username, name: row.name, currency: row.currency, createdAt: row.created_at };
}

function getUserData(userId) {
  const transactions = db.prepare(
    'SELECT id, type, description, amount, category, date FROM transactions WHERE user_id = ?'
  ).all(userId);

  const budgetRows = db.prepare(
    'SELECT category, amount, description FROM budgets WHERE user_id = ?'
  ).all(userId);
  const budgets = {};
  budgetRows.forEach(b => { budgets[b.category] = { amount: b.amount, description: b.description || '' }; });

  const goals = db.prepare(
    'SELECT id, name, target, saved FROM goals WHERE user_id = ?'
  ).all(userId);

  return { transactions, budgets, goals };
}

// ---------- auth routes ----------
app.post('/api/auth/register', (req, res) => {
  const { name, username, password, currency } = req.body || {};

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required.' });
  }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username: 3-20 characters, letters/numbers/underscore only.' });
  }
  if (password.length < 6 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password needs 6+ characters, one capital letter, and one symbol.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = Date.now();

  const info = db.prepare(
    'INSERT INTO users (username, name, password_hash, currency, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(username, name, passwordHash, currency || 'KSh', createdAt);

  req.session.userId = info.lastInsertRowid;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ user: publicUser(user), transactions: [], budgets: {}, goals: [] });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).toLowerCase());
  if (!user) return res.status(401).json({ error: 'No account with that username.' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password.' });

  req.session.userId = user.id;
  const { transactions, budgets, goals } = getUserData(user.id);
  res.json({ user: publicUser(user), transactions, budgets, goals });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Restores a session on page load (equivalent of the old "session" storage key).
app.get('/api/auth/session', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ user: null });
  const { transactions, budgets, goals } = getUserData(user.id);
  res.json({ user: publicUser(user), transactions, budgets, goals });
});

app.put('/api/auth/currency', requireAuth, (req, res) => {
  const { currency } = req.body || {};
  if (!currency) return res.status(400).json({ error: 'Currency is required.' });
  db.prepare('UPDATE users SET currency = ? WHERE id = ?').run(currency, req.session.userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: publicUser(user) });
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 6 || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password needs 6+ characters, one capital letter, and one symbol.' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.session.userId);
  res.json({ ok: true });
});

// ---------- transactions ----------
app.get('/api/transactions', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT id, type, description, amount, category, date FROM transactions WHERE user_id = ?'
  ).all(req.session.userId);
  res.json(rows);
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const { type, description, amount, category, date } = req.body || {};
  if (!['income', 'expense'].includes(type) || !date || amount == null) {
    return res.status(400).json({ error: 'type, amount, and date are required.' });
  }
  const id = 'tx_' + Date.now() + Math.random().toString(36).slice(2, 7);
  db.prepare(
    'INSERT INTO transactions (id, user_id, type, description, amount, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.session.userId, type, description || '', parseFloat(amount), category || '', date);
  res.json({ id, type, description, amount: parseFloat(amount), category, date });
});

app.put('/api/transactions/:id', requireAuth, (req, res) => {
  const { type, description, amount, category, date } = req.body || {};
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'Transaction not found.' });

  db.prepare(
    'UPDATE transactions SET type=?, description=?, amount=?, category=?, date=? WHERE id=? AND user_id=?'
  ).run(type, description || '', parseFloat(amount), category || '', date, req.params.id, req.session.userId);
  res.json({ id: req.params.id, type, description, amount: parseFloat(amount), category, date });
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// ---------- budgets ----------
app.get('/api/budgets', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT category, amount, description FROM budgets WHERE user_id = ?').all(req.session.userId);
  const budgets = {};
  rows.forEach(b => { budgets[b.category] = { amount: b.amount, description: b.description || '' }; });
  res.json(budgets);
});

app.put('/api/budgets/:category', requireAuth, (req, res) => {
  const { amount, description } = req.body || {};
  if (amount == null || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'amount is required.' });
  const category = req.params.category;
  db.prepare(`
    INSERT INTO budgets (user_id, category, amount, description) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category) DO UPDATE SET amount = excluded.amount, description = excluded.description
  `).run(req.session.userId, category, parseFloat(amount), description || '');
  res.json({ category, amount: parseFloat(amount), description: description || '' });
});

app.delete('/api/budgets/:category', requireAuth, (req, res) => {
  db.prepare('DELETE FROM budgets WHERE user_id = ? AND category = ?').run(req.session.userId, req.params.category);
  res.json({ ok: true });
});

// ---------- goals ----------
app.get('/api/goals', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, name, target, saved FROM goals WHERE user_id = ?').all(req.session.userId);
  res.json(rows);
});

app.post('/api/goals', requireAuth, (req, res) => {
  const { name, target } = req.body || {};
  if (!name || target == null || isNaN(parseFloat(target))) {
    return res.status(400).json({ error: 'name and target are required.' });
  }
  const id = 'goal_' + Date.now() + Math.random().toString(36).slice(2, 6);
  db.prepare('INSERT INTO goals (id, user_id, name, target, saved) VALUES (?, ?, ?, ?, 0)')
    .run(id, req.session.userId, name, parseFloat(target));
  res.json({ id, name, target: parseFloat(target), saved: 0 });
});

// Adds funds to a goal (delta-based, matching the original "Add funds" prompt behavior).
app.put('/api/goals/:id/add-funds', requireAuth, (req, res) => {
  const { amount } = req.body || {};
  const delta = parseFloat(amount);
  if (isNaN(delta) || delta <= 0) return res.status(400).json({ error: 'A positive amount is required.' });

  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found.' });

  const newSaved = goal.saved + delta;
  db.prepare('UPDATE goals SET saved = ? WHERE id = ? AND user_id = ?').run(newSaved, req.params.id, req.session.userId);
  res.json({ id: goal.id, name: goal.name, target: goal.target, saved: newSaved });
});

app.delete('/api/goals/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`BudgetBuddy server running at http://localhost:${PORT}`);
});
