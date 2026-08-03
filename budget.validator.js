const BaseRepository = require('./base.repository');

class CategoryRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'categories');
  }

  async findByName(name) {
    const [rows] = await this.pool.query('SELECT * FROM categories WHERE name = ? LIMIT 1', [name]);
    return rows[0] || null;
  }
}

module.exports = CategoryRepository;
