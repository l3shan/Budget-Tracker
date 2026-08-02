# BudgetBuddy Project Guide

## Overview

BudgetBuddy is a personal finance dashboard for tracking spending, budgets, savings goals, recurring transactions, and generated reports. The current workspace mixes a polished browser UI with a small server-side API foundation.

## Frontend responsibilities

- The main interface is defined in [index.html](../index.html).
- Client-side behavior and UI state live in [app.js](../app.js).
- Styling, layout, cards, charts, and interactive UI rules are in [style.css](../style.css).

The frontend uses browser storage to persist user data between sessions when the storage bridge is available.

## Backend responsibilities

- [server.js](../server.js) runs the Express application and exposes REST endpoints.
- [db.js](../db.js) initializes the SQLite database and table schema.
- [package.json](../package.json) defines the project scripts and runtime dependencies.

The backend provides:

- user registration and authentication
- session management
- transaction CRUD operations
- budget CRUD operations
- savings goals operations
- secure password handling with `bcryptjs`

## Data model

### Users

- `id`
- `username`
- `name`
- `password_hash`
- `currency`
- `created_at`

### Transactions

- `id`
- `user_id`
- `type`
- `description`
- `amount`
- `category`
- `date`

### Budgets

- `user_id`
- `category`
- `amount`
- `description`

### Goals

- `id`
- `user_id`
- `name`
- `target`
- `saved`

## Local run steps

```bash
npm install
npm start
```

Then visit:

```text
http://localhost:3000
```

## Notes for maintainers

- The app currently has two persistence patterns in the repo: browser storage in the client and SQLite in the API layer.
- For a production-ready deployment, it would be better to standardize on one persistence model and a persistent session store.
- The backend should be protected behind HTTPS and configured with a production-safe `SESSION_SECRET`.
