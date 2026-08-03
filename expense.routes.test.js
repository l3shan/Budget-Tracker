const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const requireAuth = require('../middlewares/auth.middleware');
const { registerValidator, loginValidator } = require('../validators/auth.validator');

/** @param {import('../controllers/auth.controller')} authController */
function authRoutes(authController) {
  const router = Router();

  router.post('/register', validate(registerValidator), authController.register);
  router.post('/login', validate(loginValidator), authController.login);
  router.get('/me', requireAuth, authController.me);

  return router;
}

module.exports = authRoutes;
