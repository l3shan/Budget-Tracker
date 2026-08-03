const ApiError = require('../utils/ApiError');

class BudgetService {
  /** @param {import('../repositories/budget.repository')} budgetRepository */
  constructor(budgetRepository) {
    this.budgetRepository = budgetRepository;
  }

  async createBudget(userId, { monthly_limit, month, year }) {
    const existing = await this.budgetRepository.findByUserMonthYear(userId, month, year);
    if (existing) {
      throw ApiError.conflict('A budget for this month/year already exists. Use update instead.');
    }
    return this.budgetRepository.create({ user_id: userId, monthly_limit, month, year });
  }

  async listBudgets(userId) {
    return this.budgetRepository.findAllByUser(userId);
  }

  async getBudget(userId, id) {
    const budget = await this.budgetRepository.findById(id);
    if (!budget || budget.user_id !== userId) {
      throw ApiError.notFound('Budget not found');
    }
    return budget;
  }

  async updateBudget(userId, id, updates) {
    const owns = await this.budgetRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Budget not found');
    }
    return this.budgetRepository.updateById(id, updates);
  }

  async deleteBudget(userId, id) {
    const owns = await this.budgetRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Budget not found');
    }
    await this.budgetRepository.deleteById(id);
    return { id };
  }
}

module.exports = BudgetService;
