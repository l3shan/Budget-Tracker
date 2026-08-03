/**
 * DashboardService
 * ---------------------------------------------------------------------------
 * Pure aggregation logic: combines data from three repositories to build the
 * summary the frontend dashboard renders. Keeping this math in the service
 * layer (rather than in the controller, or duplicated in the frontend) means
 * it has exactly one implementation and is independently unit-testable.
 */
class DashboardService {
  /**
   * @param {import('../repositories/budget.repository')} budgetRepository
   * @param {import('../repositories/income.repository')} incomeRepository
   * @param {import('../repositories/expense.repository')} expenseRepository
   */
  constructor(budgetRepository, incomeRepository, expenseRepository) {
    this.budgetRepository = budgetRepository;
    this.incomeRepository = incomeRepository;
    this.expenseRepository = expenseRepository;
  }

  async getSummary(userId, month, year) {
    const [budget, totalIncome, totalExpenses, categoryBreakdown] = await Promise.all([
      this.budgetRepository.findByUserMonthYear(userId, month, year),
      this.incomeRepository.sumForMonth(userId, month, year),
      this.expenseRepository.sumForMonth(userId, month, year),
      this.expenseRepository.breakdownByCategory(userId, month, year),
    ]);

    const monthlyLimit = budget ? Number(budget.monthly_limit) : 0;
    const remainingBalance = totalIncome - totalExpenses;
    const budgetUsagePercent = monthlyLimit > 0 ? Number(((totalExpenses / monthlyLimit) * 100).toFixed(2)) : null;

    return {
      month,
      year,
      monthlyLimit,
      totalIncome,
      totalExpenses,
      remainingBalance,
      budgetUsagePercent,
      isOverBudget: monthlyLimit > 0 ? totalExpenses > monthlyLimit : false,
      categoryBreakdown,
    };
  }
}

module.exports = DashboardService;
