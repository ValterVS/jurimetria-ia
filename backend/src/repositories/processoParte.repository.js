const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    pp.id_processo, pp.id_parte, pp.id_tipo_parte, pp.polo,
    pa.nome_parte, pa.cpf_cnpj, pa.endereco,
    tp.nome_tipo
  FROM processo_partes pp
  JOIN partes pa ON pa.id_parte = pp.id_parte
  LEFT JOIN tipo_parte tp ON tp.id_tipo_parte = pp.id_tipo_parte
`;

async function findByProcesso(idProcesso) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE pp.id_processo = $1 ORDER BY pa.nome_parte ASC`, [
    idProcesso,
  ]);
  return rows;
}

async function findOne(idProcesso, idParte) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE pp.id_processo = $1 AND pp.id_parte = $2`, [
    idProcesso,
    idParte,
  ]);
  return rows[0] || null;
}

async function create(idProcesso, { id_parte, id_tipo_parte = null, polo }) {
  await pool.query(
    'INSERT INTO processo_partes (id_processo, id_parte, id_tipo_parte, polo) VALUES ($1, $2, $3, $4)',
    [idProcesso, id_parte, id_tipo_parte, polo]
  );
  return findOne(idProcesso, id_parte);
}

async function update(idProcesso, idParte, { id_tipo_parte = null, polo }) {
  await pool.query(
    'UPDATE processo_partes SET id_tipo_parte = $1, polo = $2 WHERE id_processo = $3 AND id_parte = $4',
    [id_tipo_parte, polo, idProcesso, idParte]
  );
  return findOne(idProcesso, idParte);
}

async function remove(idProcesso, idParte) {
  const { rowCount } = await pool.query(
    'DELETE FROM processo_partes WHERE id_processo = $1 AND id_parte = $2',
    [idProcesso, idParte]
  );
  return rowCount > 0;
}

module.exports = { findByProcesso, findOne, create, update, remove };
