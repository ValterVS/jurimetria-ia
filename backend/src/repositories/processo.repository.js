const pool = require('../config/db');

// Select com joins para retornar nomes legíveis (tribunal, comarca, vara,
// situação, julgadores) junto com os ids, evitando que o frontend precise
// resolver cada FK separadamente para exibir a listagem/detalhe do processo.
const SELECT_BASE = `
  SELECT
    p.id_processo, p.numero_processo, p.categoria, p.data_distribuicao, p.valor_causa,
    p.id_tribunal, t.nome_tribunal,
    p.id_comarca, c.nome_comarca,
    p.id_vara, v.nome_vara,
    p.id_situacao, sp.nome_situacao,
    p.id_juiz, j.nome_juiz,
    p.id_desembargador, d.nome_desembargador,
    p.id_ministro, m.nome_ministro
  FROM processos p
  JOIN tribunal t ON t.id_tribunal = p.id_tribunal
  JOIN comarca c ON c.id_comarca = p.id_comarca
  JOIN vara v ON v.id_vara = p.id_vara
  JOIN situacao_processo sp ON sp.id_situacao = p.id_situacao
  LEFT JOIN juiz j ON j.id_juiz = p.id_juiz
  LEFT JOIN desembargador d ON d.id_desembargador = p.id_desembargador
  LEFT JOIN ministro m ON m.id_ministro = p.id_ministro
`;

// Monta cláusula WHERE dinâmica a partir dos filtros informados. Nomes de
// coluna são fixos (definidos aqui, nunca vindos do request); valores
// sempre via parâmetros posicionais ($1, $2...).
function buildWhere(filters) {
  const conditions = [];
  const params = [];

  const addCondition = (column, value, operator = '=') => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    conditions.push(`${column} ${operator} $${params.length}`);
  };

  addCondition('p.id_tribunal', filters.id_tribunal);
  addCondition('p.id_comarca', filters.id_comarca);
  addCondition('p.id_vara', filters.id_vara);
  addCondition('p.id_juiz', filters.id_juiz);
  addCondition('p.id_desembargador', filters.id_desembargador);
  addCondition('p.id_situacao', filters.id_situacao);
  addCondition('p.data_distribuicao', filters.data_inicio, '>=');
  addCondition('p.data_distribuicao', filters.data_fim, '<=');

  if (filters.numero_processo) {
    params.push(`%${filters.numero_processo}%`);
    conditions.push(`p.numero_processo ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

async function findAll(filters = {}, { limit = 20, offset = 0 } = {}) {
  const { whereClause, params } = buildWhere(filters);

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `${SELECT_BASE} ${whereClause} ORDER BY p.data_distribuicao DESC, p.id_processo DESC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`,
    dataParams
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM processos p ${whereClause}`,
    params
  );

  return { items: rows, total: countRows[0].total };
}

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE p.id_processo = $1`, [id]);
  return rows[0] || null;
}

async function findByNumero(numeroProcesso) {
  const { rows } = await pool.query('SELECT id_processo FROM processos WHERE numero_processo = $1', [
    numeroProcesso,
  ]);
  return rows[0] || null;
}

const WRITABLE_COLUMNS = [
  'numero_processo',
  'categoria',
  'id_tribunal',
  'id_comarca',
  'id_vara',
  'data_distribuicao',
  'valor_causa',
  'id_situacao',
  'id_juiz',
  'id_desembargador',
  'id_ministro',
];

async function create(data) {
  const values = WRITABLE_COLUMNS.map((col) => data[col] ?? null);
  const placeholders = WRITABLE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO processos (${WRITABLE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id_processo`,
    values
  );
  return findById(rows[0].id_processo);
}

async function update(id, data) {
  const values = WRITABLE_COLUMNS.map((col) => data[col] ?? null);
  const setClause = WRITABLE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');

  await pool.query(`UPDATE processos SET ${setClause} WHERE id_processo = $${WRITABLE_COLUMNS.length + 1}`, [
    ...values,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM processos WHERE id_processo = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, findByNumero, create, update, remove };
