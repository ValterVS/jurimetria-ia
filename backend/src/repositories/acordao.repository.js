const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    a.id_acordao, a.id_processo, a.data_acordao, a.reforma_sentenca, a.id_analise,
    a.id_relator, dr.nome_desembargador AS nome_relator,
    a.id_desembargador1, d1.nome_desembargador AS nome_desembargador1,
    a.id_desembargador2, d2.nome_desembargador AS nome_desembargador2,
    a.id_tipo_acordao, ta.tipo_acordao AS nome_tipo_acordao,
    a.id_tribunal, t.nome_tribunal,
    sa.tipo_analise AS status_analise
  FROM acordao a
  LEFT JOIN tipo_acordao ta ON ta.id_tipo_acordao = a.id_tipo_acordao
  LEFT JOIN desembargador dr ON dr.id_desembargador = a.id_relator
  LEFT JOIN desembargador d1 ON d1.id_desembargador = a.id_desembargador1
  LEFT JOIN desembargador d2 ON d2.id_desembargador = a.id_desembargador2
  LEFT JOIN tribunal t ON t.id_tribunal = a.id_tribunal
  LEFT JOIN analise_decisao ad ON ad.id_analise = a.id_analise
  LEFT JOIN status_analise sa ON sa.id_status_analise = ad.id_status_analise
`;

async function findByProcesso(idProcesso) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE a.id_processo = $1 ORDER BY a.data_acordao DESC NULLS LAST, a.id_acordao DESC`,
    [idProcesso]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE a.id_acordao = $1`, [id]);
  return rows[0] || null;
}

const CREATE_COLUMNS = [
  'id_processo',
  'id_relator',
  'id_desembargador1',
  'id_desembargador2',
  'data_acordao',
  'id_tipo_acordao',
  'reforma_sentenca',
  'id_tribunal',
];
const UPDATE_COLUMNS = CREATE_COLUMNS.filter((col) => col !== 'id_processo');

async function create(data) {
  const values = CREATE_COLUMNS.map((col) => data[col] ?? null);
  const placeholders = CREATE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO acordao (${CREATE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id_acordao`,
    values
  );
  return findById(rows[0].id_acordao);
}

async function update(id, data) {
  const values = UPDATE_COLUMNS.map((col) => data[col] ?? null);
  const setClause = UPDATE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');

  await pool.query(`UPDATE acordao SET ${setClause} WHERE id_acordao = $${UPDATE_COLUMNS.length + 1}`, [
    ...values,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM acordao WHERE id_acordao = $1', [id]);
  return rowCount > 0;
}

async function linkAnalise(id, idAnalise) {
  await pool.query('UPDATE acordao SET id_analise = $1 WHERE id_acordao = $2', [idAnalise, id]);
  return findById(id);
}

// atualização pontual, sem reescrever as demais colunas via update()
async function updateReformaSentenca(id, reformaSentenca) {
  await pool.query('UPDATE acordao SET reforma_sentenca = $1 WHERE id_acordao = $2', [reformaSentenca, id]);
  return findById(id);
}

// Preenchimento pela IA: só grava nas colunas que ainda estão vazias, para
// nunca sobrescrever o que o usuário informou. `campos` aceita as colunas
// de PREENCHIMENTO_IA.
const PREENCHIMENTO_IA = [
  'id_tipo_acordao',
  'id_tribunal',
  'id_relator',
  'id_desembargador1',
  'id_desembargador2',
  'data_acordao',
];

async function preencherCamposVazios(id, campos) {
  const colunas = PREENCHIMENTO_IA.filter((c) => campos[c] !== undefined && campos[c] !== null);
  if (colunas.length === 0) return findById(id);

  const setClause = colunas.map((c, i) => `${c} = COALESCE(${c}, $${i + 1})`).join(', ');
  await pool.query(`UPDATE acordao SET ${setClause} WHERE id_acordao = $${colunas.length + 1}`, [
    ...colunas.map((c) => campos[c]),
    id,
  ]);
  return findById(id);
}

module.exports = {
  findByProcesso,
  findById,
  create,
  update,
  remove,
  linkAnalise,
  updateReformaSentenca,
  preencherCamposVazios,
};
