const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    s.id_sentenca, s.id_processo, s.data_sentenca, s.id_analise,
    s.id_juiz, j.nome_juiz,
    s.id_tipo_sentenca, ts.tipo_sentenca AS nome_tipo_sentenca,
    s.id_tribunal, t.nome_tribunal,
    s.id_comarca, c.nome_comarca,
    s.id_vara, v.nome_vara,
    sa.tipo_analise AS status_analise
  FROM sentenca s
  JOIN juiz j ON j.id_juiz = s.id_juiz
  JOIN tipo_sentenca ts ON ts.id_tipo_sentenca = s.id_tipo_sentenca
  LEFT JOIN tribunal t ON t.id_tribunal = s.id_tribunal
  LEFT JOIN comarca c ON c.id_comarca = s.id_comarca
  LEFT JOIN vara v ON v.id_vara = s.id_vara
  LEFT JOIN analise_decisao ad ON ad.id_analise = s.id_analise
  LEFT JOIN status_analise sa ON sa.id_status_analise = ad.id_status_analise
`;

async function findByProcesso(idProcesso) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE s.id_processo = $1 ORDER BY s.data_sentenca DESC NULLS LAST, s.id_sentenca DESC`,
    [idProcesso]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE s.id_sentenca = $1`, [id]);
  return rows[0] || null;
}

const CREATE_COLUMNS = ['id_processo', 'id_juiz', 'data_sentenca', 'id_tipo_sentenca', 'id_tribunal', 'id_comarca', 'id_vara'];
// id_processo não é alterável depois de criada a sentença.
const UPDATE_COLUMNS = CREATE_COLUMNS.filter((col) => col !== 'id_processo');

async function create(data) {
  const values = CREATE_COLUMNS.map((col) => data[col] ?? null);
  const placeholders = CREATE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO sentenca (${CREATE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id_sentenca`,
    values
  );
  return findById(rows[0].id_sentenca);
}

async function update(id, data) {
  const values = UPDATE_COLUMNS.map((col) => data[col] ?? null);
  const setClause = UPDATE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');

  await pool.query(`UPDATE sentenca SET ${setClause} WHERE id_sentenca = $${UPDATE_COLUMNS.length + 1}`, [
    ...values,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sentenca WHERE id_sentenca = $1', [id]);
  return rowCount > 0;
}

async function linkAnalise(id, idAnalise) {
  await pool.query('UPDATE sentenca SET id_analise = $1 WHERE id_sentenca = $2', [idAnalise, id]);
  return findById(id);
}

module.exports = { findByProcesso, findById, create, update, remove, linkAnalise };
