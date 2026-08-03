const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

class BudgetController {
  /** @param {import('../services/budget.service')} budgetService */
  constructor(budgetService) {
    this.budgetService = budgetService;

    this.create = asyncHandler(this.create.bind(this));
    this.list = asyncHandler(this.list.bind(this));
    this.getOne = asyncHandler(this.getOne.bind(this));
    this.update = asyncHandler(this.update.bind(this));
    this.remove = asyncHandler(this.remove.bind(this));
  }

  async create(req, res) {
    const budget = await this.budgetService.createBudget(req.user.id, req.body);
    ApiResponse.send(res, 201, budget, 'Budget created successfully');
  }

  async list(req, res) {
    const budgets = await this.budgetService.listBudgets(req.user.id);
    ApiResponse.send(res, 200, budgets, 'Budgets fetched successfully');
  }

  async getOne(req, res) {
    const budget = await this.budgetService.getBudget(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, budget, 'Budget fetched successfully');
  }

  async update(req, res) {
    const budget = await this.budgetService.updateBudget(req.user.id, Number(req.params.id), req.body);
    ApiResponse.send(res, 200, budget, 'Budget updated successfully');
  }

  async remove(req, res) {
    const result = await this.budgetService.deleteBudget(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, result, 'Budget deleted successfully');
  }
}

module.exports = BudgetController;
