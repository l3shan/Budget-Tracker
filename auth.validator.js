const BaseRepository = require('./base.repository');

class BudgetRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'budgets');
  }

  async findAllByUser(userId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM budgets WHERE user_id = ? ORDER BY year DESC, month DESC',
      [userId]
    );
    return rows;
  }

  async findByUserMonthYear(userId, month, year) {
    const [rows] = await this.pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? LIMIT 1',
      [userId, month, year]
    );
    return rows[0] || null;
  }

  /** Ownership check used before update/delete so users can't touch each other's rows. */
  async belongsToUser(id, userId) {
    const [rows] = await this.pool.query('SELECT id FROM budgets WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
    return rows.length > 0;
  }
}

module.exports = BudgetRepository;
