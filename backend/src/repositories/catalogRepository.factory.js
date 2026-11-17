const pool = require('../config/db');

// Fábrica de repository para tabelas de catálogo simples (id + nome +
// FK opcional para uma tabela "pai"). Nomes de tabela/coluna vêm sempre
// fixos do código, nunca de input do usuário; os valores sempre vão por
// parâmetro ($1, $2...).
function createCatalogRepository({ table, idColumn, nameColumn, parentColumn = null }) {
  const columns = parentColumn ? [idColumn, nameColumn, parentColumn] : [idColumn, nameColumn];
  const columnList = columns.join(', ');

  async function findAll({ parentId } = {}) {
    if (parentColumn && parentId) {
      const { rows } = await pool.query(
        `SELECT ${columnList} FROM ${table} WHERE ${parentColumn} = $1 ORDER BY ${nameColumn} ASC`,
        [parentId]
      );
      return rows;
    }

    const { rows } = await pool.query(`SELECT ${columnList} FROM ${table} ORDER BY ${nameColumn} ASC`);
    return rows;
  }

  async function findById(id) {
    const { rows } = await pool.query(`SELECT ${columnList} FROM ${table} WHERE ${idColumn} = $1`, [id]);
    return rows[0] || null;
  }

  async function create(data) {
    if (parentColumn) {
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${nameColumn}, ${parentColumn}) VALUES ($1, $2) RETURNING ${columnList}`,
        [data[nameColumn], data[parentColumn] ?? null]
      );
      return rows[0];
    }

    const { rows } = await pool.query(
      `INSERT INTO ${table} (${nameColumn}) VALUES ($1) RETURNING ${columnList}`,
      [data[nameColumn]]
    );
    return rows[0];
  }

  async function update(id, data) {
    if (parentColumn) {
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${nameColumn} = $1, ${parentColumn} = $2 WHERE ${idColumn} = $3 RETURNING ${columnList}`,
        [data[nameColumn], data[parentColumn] ?? null, id]
      );
      return rows[0] || null;
    }

    const { rows } = await pool.query(
      `UPDATE ${table} SET ${nameColumn} = $1 WHERE ${idColumn} = $2 RETURNING ${columnList}`,
      [data[nameColumn], id]
    );
    return rows[0] || null;
  }

  async function remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE ${idColumn} = $1`, [id]);
    return rowCount > 0;
  }

  return { table, idColumn, nameColumn, parentColumn, findAll, findById, create, update, remove };
}

module.exports = { createCatalogRepository };
