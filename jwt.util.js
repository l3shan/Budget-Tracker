/**
 * BaseRepository
 * ---------------------------------------------------------------------------
 * Generic CRUD operations shared by every repository in the app.
 *
 * Design patterns / principles demonstrated:
 *   - Repository Pattern: isolates all raw SQL behind a small, table-scoped API.
 *     Services never write SQL or know that MySQL is the storage engine.
 *   - Open/Closed Principle: this class is closed for modification but open
 *     for extension — subclasses (UserRepository, BudgetRepository, ...) add
 *     table-specific queries without ever having to change this file.
 *   - Liskov Substitution Principle: every subclass can be used anywhere a
 *     BaseRepository is expected (e.g. in generic tests or utilities) because
 *     none of them narrow or change the meaning of the inherited methods.
 *
 * All queries use parameterized placeholders (?) to prevent SQL injection.
 */
class BaseRepository {
  /**
   * @param {import('mysql2/promise').Pool} pool
   * @param {string} tableName
   */
  constructor(pool, tableName) {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract and cannot be instantiated directly');
    }
    this.pool = pool;
    this.tableName = tableName;
  }

  async findById(id) {
    const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findAll(where = {}) {
    const keys = Object.keys(where);
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    if (keys.length) {
      sql += ' WHERE ' + keys.map((k) => `${k} = ?`).join(' AND ');
      params.push(...keys.map((k) => where[k]));
    }
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  async create(data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const [result] = await this.pool.query(sql, Object.values(data));
    return this.findById(result.insertId);
  }

  async updateById(id, data) {
    const keys = Object.keys(data);
    if (!keys.length) return this.findById(id);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.pool.query(sql, [...Object.values(data), id]);
    return this.findById(id);
  }

  async deleteById(id) {
    const [result] = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = BaseRepository;
