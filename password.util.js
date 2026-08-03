const BaseRepository = require('./base.repository');

class UserRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'users');
  }

  async findByEmail(email) {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }
}

module.exports = UserRepository;
