const { Router } = require('express');
const requireAuth = require('../middlewares/auth.middleware');

/** @param {import('../controllers/category.controller')} categoryController */
function categoryRoutes(categoryController) {
  const router = Router();

  router.use(requireAuth);
  router.get('/', categoryController.list);

  return router;
}

module.exports = categoryRoutes;
