const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs an array of express-validator chains, then converts any failures into
 * a single ApiError with a `details` array — so every route gets the same
 * 400 response shape instead of hand-rolled checks scattered across
 * controllers.
 *
 * Usage: router.post('/', validate(createBudgetValidator), controller.create)
 */
function validate(validators) {
  return async (req, res, next) => {
    await Promise.all(validators.map((validator) => validator.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    next(ApiError.badRequest('Validation failed', details));
  };
}

module.exports = validate;
