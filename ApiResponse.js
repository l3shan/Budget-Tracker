const { body, param } = require('express-validator');

const createIncomeValidator = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('source').trim().notEmpty().withMessage('source is required').isLength({ max: 100 }),
  body('date').isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
];

const updateIncomeValidator = [
  param('id').isInt().withMessage('Invalid income id'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('source').optional().trim().notEmpty().isLength({ max: 100 }),
  body('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
];

const idParamValidator = [param('id').isInt().withMessage('Invalid id')];

module.exports = { createIncomeValidator, updateIncomeValidator, idParamValidator };
