const { body, param } = require('express-validator');

const createExpenseValidator = [
  body('category').trim().notEmpty().withMessage('category is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('date').isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
];

const updateExpenseValidator = [
  param('id').isInt().withMessage('Invalid expense id'),
  body('category').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
];

const idParamValidator = [param('id').isInt().withMessage('Invalid id')];

module.exports = { createExpenseValidator, updateExpenseValidator, idParamValidator };
