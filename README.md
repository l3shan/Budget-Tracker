# BudgetBuddy — SQLite Backend

A real Express + SQLite backend for the BudgetBuddy app. It replaces the
previous client-side-only `window.storage` calls with a proper REST API and
persistent database, and moves password hashing from the browser (SHA-256) to
the server (bcrypt).

## Structure

```
budgetbuddy-backend/
├── server.js          # Express app + all /api routes
├── db.js              # SQLite schema + connection (better-sqlite3)
├── package.json
├── public/
│   └── index.html      # the BudgetBuddy frontend, now calling /api/* via fetch()
└── budgetbuddy.db      # created automatically on first run
```

## Setup

```bash
cd budgetbuddy-backend
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The server serves the
frontend from `public/` and the API from `/api/*` on the same origin, so there
are no CORS issues.

The SQLite database file `budgetbuddy.db` is created automatically the first
time you run the server. Delete it any time to reset all data.

## How data flows

- **Users**: registered via `POST /api/auth/register`, password hashed with
  bcrypt and stored in the `users` table. Login (`POST /api/auth/login`) sets
  an HTTP-only session cookie (via `express-session`), so the browser never
  has to hold or resend the password after login.
- **Transactions / budgets / goals**: each row is scoped to `user_id`, so one
  person can never see or modify another's data (all mutating routes use
  `requireAuth` + filter by `req.session.userId`).
- **Session restore on page load**: the frontend's `boot()` calls
  `GET /api/auth/session`; if the cookie is valid it gets back the user plus
  all their transactions/budgets/goals in one response.

## API reference

| Method | Path                        | Auth | Description                          |
|--------|-----------------------------|------|--------------------------------------|
| POST   | /api/auth/register          | –    | Create account, log in               |
| POST   | /api/auth/login             | –    | Log in                               |
| POST   | /api/auth/logout             | –    | Log out                              |
| GET    | /api/auth/session            | –    | Restore session on page load         |
| PUT    | /api/auth/currency           | ✓    | Change display currency              |
| PUT    | /api/auth/password           | ✓    | Change password                      |
| GET    | /api/transactions             | ✓    | List all transactions                |
| POST   | /api/transactions             | ✓    | Add a transaction                    |
| PUT    | /api/transactions/:id          | ✓    | Edit a transaction                   |
| DELETE | /api/transactions/:id          | ✓    | Delete a transaction                 |
| GET    | /api/budgets                   | ✓    | Get all budgets                      |
| PUT    | /api/budgets/:category          | ✓    | Set/update a budget                  |
| DELETE | /api/budgets/:category          | ✓    | Remove a budget                      |
| GET    | /api/goals                      | ✓    | List savings goals                   |
| POST   | /api/goals                      | ✓    | Create a savings goal                |
| PUT    | /api/goals/:id/add-funds         | ✓    | Add funds to a goal                  |
| DELETE | /api/goals/:id                  | ✓    | Delete a goal                        |

## Notes / next steps

- Sessions currently use the default in-memory `express-session` store, which
  is fine for local/single-instance use but will drop sessions on restart. For
  production, swap in a persistent store (e.g. `connect-sqlite3`) pointed at
  the same database.
- Set `SESSION_SECRET` as an environment variable in production instead of
  relying on the default dev value in `server.js`.
- Put this behind HTTPS in production — the session cookie protects the login,
  but cookies over plain HTTP can still be intercepted on the network.
