const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

class ExpenseController {
  /** @param {import('../services/expense.service')} expenseService */
  constructor(expenseService) {
    this.expenseService = expenseService;

    this.create = asyncHandler(this.create.bind(this));
    this.list = asyncHandler(this.list.bind(this));
    this.getOne = asyncHandler(this.getOne.bind(this));
    this.update = asyncHandler(this.update.bind(this));
    this.remove = asyncHandler(this.remove.bind(this));
  }

  async create(req, res) {
    const expense = await this.expenseService.addExpense(req.user.id, req.body);
    ApiResponse.send(res, 201, expense, 'Expense recorded successfully');
  }

  async list(req, res) {
    const expenses = await this.expenseService.listExpenses(req.user.id);
    ApiResponse.send(res, 200, expenses, 'Expenses fetched successfully');
  }

  async getOne(req, res) {
    const expense = await this.expenseService.getExpense(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, expense, 'Expense fetched successfully');
  }

  async update(req, res) {
    const expense = await this.expenseService.updateExpense(req.user.id, Number(req.params.id), req.body);
    ApiResponse.send(res, 200, expense, 'Expense updated successfully');
  }

  async remove(req, res) {
    const result = await this.expenseService.deleteExpense(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, result, 'Expense deleted successfully');
  }
}

module.exports = ExpenseController;
