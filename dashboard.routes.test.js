/**
 * Composition Root
 * ---------------------------------------------------------------------------
 * This is the ONE place in the whole app where concrete classes are
 * instantiated and wired together. Every other module (services,
 * controllers) receives its dependencies through its constructor and never
 * calls `new` on a repository/service itself.
 *
 * Why this matters for the architecture:
 *   - Dependency Inversion Principle: high-level modules (services) depend on
 *     abstractions (repository method contracts), and this file is what
 *     supplies the concrete implementation at runtime.
 *   - Testability: unit tests import the *class* directly and inject a fake/
 *     mock repository, completely bypassing this file and the real database.
 *   - Single place to swap implementations, e.g. an InMemoryUserRepository
 *     for a demo, without touching services or controllers at all.
 */

const { Router } = require('express');
const { pool } = require('../config/db');

// Repositories
const UserRepository = require('../repositories/user.repository');
const BudgetRepository = require('../repositories/budget.repository');
const IncomeRepository = require('../repositories/income.repository');
const ExpenseRepository = require('../repositories/expense.repository');
const CategoryRepository = require('../repositories/category.repository');

// Services
const AuthService = require('../services/auth.service');
const BudgetService = require('../services/budget.service');
const IncomeService = require('../services/income.service');
const ExpenseService = require('../services/expense.service');
const DashboardService = require('../services/dashboard.service');

// Controllers
const AuthController = require('../controllers/auth.controller');
const BudgetController = require('../controllers/budget.controller');
const IncomeController = require('../controllers/income.controller');
const ExpenseController = require('../controllers/expense.controller');
const DashboardController = require('../controllers/dashboard.controller');
const CategoryController = require('../controllers/category.controller');

// Route factories
const authRoutes = require('./auth.routes');
const budgetRoutes = require('./budget.routes');
const incomeRoutes = require('./income.routes');
const expenseRoutes = require('./expense.routes');
const dashboardRoutes = require('./dashboard.routes');
const categoryRoutes = require('./category.routes');

function buildApiRouter() {
  // 1. Repositories (data access layer)
  const userRepository = new UserRepository(pool);
  const budgetRepository = new BudgetRepository(pool);
  const incomeRepository = new IncomeRepository(pool);
  const expenseRepository = new ExpenseRepository(pool);
  const categoryRepository = new CategoryRepository(pool);

  // 2. Services (business logic layer) — constructor injection
  const authService = new AuthService(userRepository);
  const budgetService = new BudgetService(budgetRepository);
  const incomeService = new IncomeService(incomeRepository);
  const expenseService = new ExpenseService(expenseRepository, categoryRepository);
  const dashboardService = new DashboardService(budgetRepository, incomeRepository, expenseRepository);

  // 3. Controllers (presentation layer) — constructor injection
  const authController = new AuthController(authService);
  const budgetController = new BudgetController(budgetService);
  const incomeController = new IncomeController(incomeService);
  const expenseController = new ExpenseController(expenseService);
  const dashboardController = new DashboardController(dashboardService);
  const categoryController = new CategoryController(categoryRepository);

  // 4. Routes
  const router = Router();
  router.use('/auth', authRoutes(authController));
  router.use('/budgets', budgetRoutes(budgetController));
  router.use('/income', incomeRoutes(incomeController));
  router.use('/expenses', expenseRoutes(expenseController));
  router.use('/dashboard', dashboardRoutes(dashboardController));
  router.use('/categories', categoryRoutes(categoryController));

  return router;
}

module.exports = buildApiRouter;
