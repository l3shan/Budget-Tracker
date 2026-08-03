const BaseRepository = require('./base.repository');

class ExpenseRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'expenses');
  }

  async findAllByUser(userId) {
    const [rows] = await this.pool.query(
      `SELECT e.*, c.name AS category_name
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = ?
       ORDER BY e.date DESC`,
      [userId]
    );
    return rows;
  }

  async findByIdWithCategory(id) {
    const [rows] = await this.pool.query(
      `SELECT e.*, c.name AS category_name
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async belongsToUser(id, userId) {
    const [rows] = await this.pool.query('SELECT id FROM expenses WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
    return rows.length > 0;
  }

  /** Sum of all expenses for a user within a given month/year — used by the dashboard. */
  async sumForMonth(userId, month, year) {
    const [rows] = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
      [userId, month, year]
    );
    return Number(rows[0].total);
  }

  /** Spending broken down by category for a given month/year — powers the summary chart. */
  async breakdownByCategory(userId, month, year) {
    const [rows] = await this.pool.query(
      `SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS total
       FROM categories c
       LEFT JOIN expenses e
         ON e.category_id = c.id
        AND e.user_id = ?
        AND MONTH(e.date) = ?
        AND YEAR(e.date) = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [userId, month, year]
    );
    return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
  }
}

module.exports = ExpenseRepository;
