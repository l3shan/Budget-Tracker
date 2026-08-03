-- ============================================================================
-- Student Budget Planner — Database Schema
-- Engine: MySQL 8.0+
-- Design notes:
--   * 3NF normalization: categories are extracted into their own table rather
--     than stored as free-text on `expenses`, removing repeating/derived data.
--   * Every child table has an ON DELETE CASCADE foreign key to `users`, so
--     deleting a user's account cleanly removes their financial data.
--   * CHECK constraints enforce domain rules at the database level as a last
--     line of defense (the API/service layer also validates on the way in).
--   * Indexes are added on every foreign key and on columns used in the
--     dashboard's date-range / aggregation queries.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS student_budget_planner
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE student_budget_planner;

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table: categories
-- Lookup table for expense categories (normalizes what would otherwise be a
-- repeated free-text string on every expense row).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table: budgets
-- One budget row per user per month/year.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED   NOT NULL,
  monthly_limit  DECIMAL(10,2)  NOT NULL,
  month          TINYINT UNSIGNED NOT NULL,
  year           SMALLINT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_budgets_user_month_year UNIQUE (user_id, month, year),
  CONSTRAINT chk_budgets_limit_positive CHECK (monthly_limit >= 0),
  CONSTRAINT chk_budgets_month_range CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_budgets_year_range CHECK (year BETWEEN 2000 AND 2100)
) ENGINE=InnoDB;

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_user_month_year ON budgets(user_id, year, month);

-- ----------------------------------------------------------------------------
-- Table: income
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  source      VARCHAR(100)  NOT NULL,
  date        DATE          NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_income_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_income_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_user_date ON income(user_id, date);

-- ----------------------------------------------------------------------------
-- Table: expenses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  category_id  INT UNSIGNED  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  description  VARCHAR(255),
  date         DATE          NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_category
    FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);

-- ----------------------------------------------------------------------------
-- Seed data: default expense categories
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO categories (name, is_default) VALUES
  ('Food',          TRUE),
  ('Transport',     TRUE),
  ('Housing/Rent',  TRUE),
  ('Utilities',     TRUE),
  ('Education',     TRUE),
  ('Entertainment', TRUE),
  ('Health',        TRUE),
  ('Other',         TRUE);
