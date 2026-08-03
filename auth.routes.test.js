const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const requireAuth = require('../middlewares/auth.middleware');
const {
  createExpenseValidator,
  updateExpenseValidator,
  idParamValidator,
} = require('../validators/expense.validator');

/** @param {import('../controllers/expense.controller')} expenseController */
function expenseRoutes(expenseController) {
  const router = Router();

  router.use(requireAuth);

  router.post('/', validate(createExpenseValidator), expenseController.create);
  router.get('/', expenseController.list);
  router.get('/:id', validate(idParamValidator), expenseController.getOne);
  router.put('/:id', validate(updateExpenseValidator), expenseController.update);
  router.delete('/:id', validate(idParamValidator), expenseController.remove);

  return router;
}

module.exports = expenseRoutes;
