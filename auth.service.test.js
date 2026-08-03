const { Router } = require('express');
const requireAuth = require('../middlewares/auth.middleware');

/** @param {import('../controllers/dashboard.controller')} dashboardController */
function dashboardRoutes(dashboardController) {
  const router = Router();

  router.use(requireAuth);
  router.get('/summary', dashboardController.getSummary);

  return router;
}

module.exports = dashboardRoutes;
