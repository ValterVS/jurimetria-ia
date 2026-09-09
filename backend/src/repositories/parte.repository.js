const pool = require('../config/db');

const COLUMNS = 'id_parte, nome_parte, cpf_cnpj, endereco';

async function findAll({ q, limit = 50, offset = 0 } = {}) {
  if (q) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM partes
       WHERE nome_parte ILIKE $1 OR cpf_cnpj ILIKE $1
       ORDER BY nome_parte ASC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset]
    );
    return rows;
  }

  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM partes ORDER BY nome_parte ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM partes WHERE id_parte = $1`, [id]);
  return rows[0] || null;
}

async function create({ nome_parte, cpf_cnpj = null, endereco = null }) {
  const { rows } = await pool.query(
    `INSERT INTO partes (nome_parte, cpf_cnpj, endereco) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [nome_parte, cpf_cnpj, endereco]
  );
  return rows[0];
}

async function update(id, { nome_parte, cpf_cnpj = null, endereco = null }) {
  const { rows } = await pool.query(
    `UPDATE partes SET nome_parte = $1, cpf_cnpj = $2, endereco = $3
     WHERE id_parte = $4 RETURNING ${COLUMNS}`,
    [nome_parte, cpf_cnpj, endereco, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM partes WHERE id_parte = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
