# BudgetBuddy

BudgetBuddy is a student-focused personal finance dashboard for tracking income, expenses, budgets, savings goals, recurring transactions, and spending reports. The app is designed around a clean, single-page experience with category-based budgeting and simple account management.

## Project summary

This repository currently contains two complementary layers:

1. A static frontend built with plain HTML, CSS, and JavaScript.
2. A small Express + SQLite backend that exposes a REST API and persistent user storage.

The frontend and the server are related but not fully unified in the current workspace snapshot. The browser app still uses local browser storage for its primary data flow, while the server side adds a persistent database-backed API for authentication and data access.

## Features

- User registration and login with password-strength validation
- Session-based restore of logged-in state
- Income and expense tracking
- Budget jars for category-level spending limits
- Savings goals with add-funds functionality
- Recurring transaction support
- Export and backup utilities
- Simple report generation for monthly summaries

## Repository structure

```text
Budget-Tracker/
├── app.js              # Frontend dashboard logic and UI state management
├── db.js               # SQLite schema and connection setup for the API layer
├── index.html          # Main UI entry page
├── server.js           # Express API, auth routes, and CRUD handlers
├── style.css           # Styling for the dashboard and auth screens
├── package.json        # Node project metadata and scripts
└── README.md           # Project documentation
```

## Runtime architecture

### Frontend layer

- [index.html](index.html) provides the application shell and all pages/styles used by the dashboard.
- [app.js](app.js) contains the UI state, user session handling, rendering logic, forms, budgets, goals, reports, and export/import helpers.
- Browser persistence is handled with a `window.storage` abstraction and fallback in-memory storage when the storage API is unavailable.

### Backend layer

- [server.js](server.js) is an Express service that serves authentication and data endpoints under `/api/*`.
- [db.js](db.js) creates the SQLite database file and schema for users, transactions, budgets, and goals.
- The backend uses `better-sqlite3`, `express`, `express-session`, and `bcryptjs`.

## How data is stored

The frontend stores most app data locally in browser storage keys such as:

- `session`
- `user:<username>`
- `transactions:<username>`
- `budgets:<username>`
- `goals:<username>`
- `recurring:<username>`
- `customCategories:<username>`

The server-side layer keeps persistent records in SQLite tables:

- `users`
- `transactions`
- `budgets`
- `goals`

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run the API server

```bash
npm start
```

The server starts on port `3000` by default:

```text
http://localhost:3000
```

### 3. Open the app locally

If you are using the static frontend, open the root HTML file in a browser or serve the folder with a local static server. If you are using the Express backend flow, ensure the API and frontend are routed consistently before testing the browser experience.

## Available scripts

From [package.json](package.json):

- `npm start` — starts the Express server
- `npm run dev` — runs the same server entry point in development mode

## API reference

The server organizes all business routes under `/api`.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST /api/auth/register` | Register a new user and create their account | Creates the account and returns the initial session payload |
| `POST /api/auth/login` | Log in a user | Validates the password and returns user + data |
| `POST /api/auth/logout` | Log out the current user | Destroys the session |
| `GET /api/auth/session` | Restore session data | Returns the current user and associated records |
| `PUT /api/auth/currency` | Change a user's currency | Requires authentication |
| `PUT /api/auth/password` | Change the current password | Requires authentication |

### Transactions

| Method | Path | Description |
|---|---|---|
| `GET /api/transactions` | List all transactions | Authenticated |
| `POST /api/transactions` | Create a transaction | Authenticated |
| `PUT /api/transactions/:id` | Update a transaction | Authenticated |
| `DELETE /api/transactions/:id` | Delete a transaction | Authenticated |

### Budgets

| Method | Path | Description |
|---|---|---|
| `GET /api/budgets` | List all budgets | Authenticated |
| `PUT /api/budgets/:category` | Create or update a budget entry | Authenticated |
| `DELETE /api/budgets/:category` | Delete a budget entry | Authenticated |

### Goals

| Method | Path | Description |
|---|---|---|
| `GET /api/goals` | List savings goals | Authenticated |
| `POST /api/goals` | Create a savings goal | Authenticated |
| `PUT /api/goals/:id/add-funds` | Add funds to a goal | Authenticated |
| `DELETE /api/goals/:id` | Delete a goal | Authenticated |

## Notes on security and production use

- The server uses a session secret fallback value in development mode. For production, set `SESSION_SECRET` in the environment.
- Session storage uses the default in-memory express session store, which is acceptable for local testing but not for multi-instance production deployment.
- Passwords are hashed in the backend with `bcryptjs` rather than being hashed directly in the browser.
- In production, the application should be served behind HTTPS and the session cookie should remain `httpOnly`.

## Development guidance

If you want to extend the application next, the most natural areas to improve are:

- unify the frontend local-storage flow with the API-backed server model
- migrate the browser storage abstraction to a single consistent persistence layer
- add a persistent session store for production deployments
- add automated tests around the API and database workflows

## Summary

BudgetBuddy is a practical personal finance app with a student-balance-oriented design. Its current codebase combines a polished static UI with a backend-ready API foundation, making it a good candidate for deeper integration between browser-side experience and server-side persistence.

## Requirements

- Node.js (v18 or later)
- npm

## Installation

1. Clone the repository.
2. Navigate to the project folder.
3. Run:

npm install

4. Start the server:

npm start

5. Open http://localhost:3000






