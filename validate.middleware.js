const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * AuthController
 * ---------------------------------------------------------------------------
 * Notice there is no business logic here at all: no password hashing, no
 * duplicate-email checking, no token signing. The controller's only job is
 * to translate HTTP <-> service calls. This is the Single Responsibility
 * Principle applied to the presentation layer.
 */
class AuthController {
  /** @param {import('../services/auth.service')} authService */
  constructor(authService) {
    this.authService = authService;

    // Bind so these can be passed directly as Express route handlers.
    this.register = asyncHandler(this.register.bind(this));
    this.login = asyncHandler(this.login.bind(this));
    this.me = asyncHandler(this.me.bind(this));
  }

  async register(req, res) {
    const user = await this.authService.register(req.body);
    ApiResponse.send(res, 201, user, 'Account created successfully');
  }

  async login(req, res) {
    const result = await this.authService.login(req.body);
    ApiResponse.send(res, 200, result, 'Logged in successfully');
  }

  async me(req, res) {
    const user = await this.authService.getProfile(req.user.id);
    ApiResponse.send(res, 200, user, 'Profile fetched successfully');
  }
}

module.exports = AuthController;
