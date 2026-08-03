const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const requireAuth = require('../middlewares/auth.middleware');
const {
  createIncomeValidator,
  updateIncomeValidator,
  idParamValidator,
} = require('../validators/income.validator');

/** @param {import('../controllers/income.controller')} incomeController */
function incomeRoutes(incomeController) {
  const router = Router();

  router.use(requireAuth);

  router.post('/', validate(createIncomeValidator), incomeController.create);
  router.get('/', incomeController.list);
  router.get('/:id', validate(idParamValidator), incomeController.getOne);
  router.put('/:id', validate(updateIncomeValidator), incomeController.update);
  router.delete('/:id', validate(idParamValidator), incomeController.remove);

  return router;
}

module.exports = incomeRoutes;
