const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const requireAuth = require('../middlewares/auth.middleware');
const {
  createBudgetValidator,
  updateBudgetValidator,
  idParamValidator,
} = require('../validators/budget.validator');

/** @param {import('../controllers/budget.controller')} budgetController */
function budgetRoutes(budgetController) {
  const router = Router();

  router.use(requireAuth); // every budget route requires a logged-in user

  router.post('/', validate(createBudgetValidator), budgetController.create);
  router.get('/', budgetController.list);
  router.get('/:id', validate(idParamValidator), budgetController.getOne);
  router.put('/:id', validate(updateBudgetValidator), budgetController.update);
  router.delete('/:id', validate(idParamValidator), budgetController.remove);

  return router;
}

module.exports = budgetRoutes;
