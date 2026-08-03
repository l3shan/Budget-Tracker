const ApiError = require('../utils/ApiError');

class ExpenseService {
  /**
   * @param {import('../repositories/expense.repository')} expenseRepository
   * @param {import('../repositories/category.repository')} categoryRepository
   */
  constructor(expenseRepository, categoryRepository) {
    this.expenseRepository = expenseRepository;
    this.categoryRepository = categoryRepository;
  }

  async _resolveCategoryId(category) {
    const found = await this.categoryRepository.findByName(category);
    if (!found) {
      throw ApiError.badRequest(
        `Unknown category "${category}". Fetch GET /api/categories for the valid list.`
      );
    }
    return found.id;
  }

  async addExpense(userId, { category, amount, description, date }) {
    const category_id = await this._resolveCategoryId(category);
    return this.expenseRepository.create({
      user_id: userId,
      category_id,
      amount,
      description: description || null,
      date,
    });
  }

  async listExpenses(userId) {
    return this.expenseRepository.findAllByUser(userId);
  }

  async getExpense(userId, id) {
    const expense = await this.expenseRepository.findByIdWithCategory(id);
    if (!expense || expense.user_id !== userId) {
      throw ApiError.notFound('Expense not found');
    }
    return expense;
  }

  async updateExpense(userId, id, updates) {
    const owns = await this.expenseRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Expense not found');
    }

    const payload = { ...updates };
    if (payload.category) {
      payload.category_id = await this._resolveCategoryId(payload.category);
      delete payload.category;
    }

    await this.expenseRepository.updateById(id, payload);
    return this.expenseRepository.findByIdWithCategory(id);
  }

  async deleteExpense(userId, id) {
    const owns = await this.expenseRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Expense not found');
    }
    await this.expenseRepository.deleteById(id);
    return { id };
  }
}

module.exports = ExpenseService;
