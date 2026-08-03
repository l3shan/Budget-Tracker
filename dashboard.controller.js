const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

class IncomeController {
  /** @param {import('../services/income.service')} incomeService */
  constructor(incomeService) {
    this.incomeService = incomeService;

    this.create = asyncHandler(this.create.bind(this));
    this.list = asyncHandler(this.list.bind(this));
    this.getOne = asyncHandler(this.getOne.bind(this));
    this.update = asyncHandler(this.update.bind(this));
    this.remove = asyncHandler(this.remove.bind(this));
  }

  async create(req, res) {
    const income = await this.incomeService.addIncome(req.user.id, req.body);
    ApiResponse.send(res, 201, income, 'Income recorded successfully');
  }

  async list(req, res) {
    const income = await this.incomeService.listIncome(req.user.id);
    ApiResponse.send(res, 200, income, 'Income fetched successfully');
  }

  async getOne(req, res) {
    const income = await this.incomeService.getIncome(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, income, 'Income fetched successfully');
  }

  async update(req, res) {
    const income = await this.incomeService.updateIncome(req.user.id, Number(req.params.id), req.body);
    ApiResponse.send(res, 200, income, 'Income updated successfully');
  }

  async remove(req, res) {
    const result = await this.incomeService.deleteIncome(req.user.id, Number(req.params.id));
    ApiResponse.send(res, 200, result, 'Income deleted successfully');
  }
}

module.exports = IncomeController;
