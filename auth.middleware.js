const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Read-only controller exposing the category lookup list so the frontend
 * can populate an expense-category dropdown without hardcoding values.
 */
class CategoryController {
  /** @param {import('../repositories/category.repository')} categoryRepository */
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
    this.list = asyncHandler(this.list.bind(this));
  }

  async list(req, res) {
    const categories = await this.categoryRepository.findAll();
    ApiResponse.send(res, 200, categories, 'Categories fetched successfully');
  }
}

module.exports = CategoryController;
