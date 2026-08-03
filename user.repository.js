const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/jwt.util');

/**
 * AuthService
 * ---------------------------------------------------------------------------
 * Owns all registration/login business rules. Notice this class depends on
 * a `userRepository` that is *passed in* rather than instantiated internally
 * (`new UserRepository(...)`). That's Dependency Inversion in practice: the
 * high-level policy (AuthService) does not depend on the low-level detail
 * (a concrete MySQL repository) — both depend on the repository's method
 * contract (findByEmail/create/findById). In tests, a fake in-memory
 * repository can be substituted with zero changes to this class.
 */
class AuthService {
  /** @param {import('../repositories/user.repository')} userRepository */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register({ name, email, password }) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const password_hash = await hashPassword(password);
    const user = await this.userRepository.create({ name, email, password_hash });

    return this._toPublicUser(user);
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = signToken({ sub: user.id, email: user.email });
    return { token, user: this._toPublicUser(user) };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return this._toPublicUser(user);
  }

  /** Strips the password hash before anything ever leaves the service layer. */
  _toPublicUser(user) {
    const { password_hash, ...publicUser } = user;
    return publicUser;
  }
}

module.exports = AuthService;
