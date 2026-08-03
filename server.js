const BaseRepository = require('./base.repository');

class IncomeRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'income');
  }

  async findAllByUser(userId) {
    const [rows] = await this.pool.query('SELECT * FROM income WHERE user_id = ? ORDER BY date DESC', [
      userId,
    ]);
    return rows;
  }

  async belongsToUser(id, userId) {
    const [rows] = await this.pool.query('SELECT id FROM income WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
    return rows.length > 0;
  }

  /** Sum of all income for a user within a given month/year — used by the dashboard. */
  async sumForMonth(userId, month, year) {
    const [rows] = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM income
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
      [userId, month, year]
    );
    return Number(rows[0].total);
  }
}

module.exports = IncomeRepository;
