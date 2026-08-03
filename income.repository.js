const ApiError = require('../utils/ApiError');

class IncomeService {
  /** @param {import('../repositories/income.repository')} incomeRepository */
  constructor(incomeRepository) {
    this.incomeRepository = incomeRepository;
  }

  async addIncome(userId, { amount, source, date }) {
    return this.incomeRepository.create({ user_id: userId, amount, source, date });
  }

  async listIncome(userId) {
    return this.incomeRepository.findAllByUser(userId);
  }

  async getIncome(userId, id) {
    const income = await this.incomeRepository.findById(id);
    if (!income || income.user_id !== userId) {
      throw ApiError.notFound('Income record not found');
    }
    return income;
  }

  async updateIncome(userId, id, updates) {
    const owns = await this.incomeRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Income record not found');
    }
    return this.incomeRepository.updateById(id, updates);
  }

  async deleteIncome(userId, id) {
    const owns = await this.incomeRepository.belongsToUser(id, userId);
    if (!owns) {
      throw ApiError.notFound('Income record not found');
    }
    await this.incomeRepository.deleteById(id);
    return { id };
  }
}

module.exports = IncomeService;
