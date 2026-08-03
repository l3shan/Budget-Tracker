const { body, param } = require('express-validator');

const createBudgetValidator = [
  body('monthly_limit').isFloat({ gt: 0 }).withMessage('monthly_limit must be a positive number'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid year'),
];

const updateBudgetValidator = [
  param('id').isInt().withMessage('Invalid budget id'),
  body('monthly_limit').optional().isFloat({ gt: 0 }).withMessage('monthly_limit must be a positive number'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
  body('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid year'),
];

const idParamValidator = [param('id').isInt().withMessage('Invalid id')];

module.exports = { createBudgetValidator, updateBudgetValidator, idParamValidator };
