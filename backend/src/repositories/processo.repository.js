const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    p.id_processo, p.id_empresa, p.numero_processo, p.categoria, p.data_distribuicao, p.valor_causa,
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

function buildWhere(filters) {
  const conditions = [];
  const params = [];

  const addCondition = (column, value, operator = '=') => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    conditions.push(`${column} ${operator} $${params.length}`);
  };

  // id_empresa é sempre injetado pelo service a partir da empresa logada -
  // nunca vem de input livre do usuário.
  addCondition('p.id_empresa', filters.id_empresa);
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

// idEmpresa é opcional aqui para não obrigar todo chamador interno a
// informá-lo, mas todo acesso vindo de uma rota HTTP deve sempre passá-lo.
async function findById(id, idEmpresa) {
  const conditions = ['p.id_processo = $1'];
  const params = [id];
  if (idEmpresa !== undefined && idEmpresa !== null) {
    params.push(idEmpresa);
    conditions.push(`p.id_empresa = $${params.length}`);
  }
  const { rows } = await pool.query(`${SELECT_BASE} WHERE ${conditions.join(' AND ')}`, params);
  return rows[0] || null;
}

async function findByNumero(numeroProcesso, idEmpresa) {
  const conditions = ['numero_processo = $1'];
  const params = [numeroProcesso];
  if (idEmpresa !== undefined && idEmpresa !== null) {
    params.push(idEmpresa);
    conditions.push(`id_empresa = $${params.length}`);
  }
  const { rows } = await pool.query(`SELECT id_processo FROM processos WHERE ${conditions.join(' AND ')}`, params);
  return rows[0] || null;
}

const CREATE_COLUMNS = [
  'id_empresa',
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
// id_empresa não é alterável depois de criado o processo.
const UPDATE_COLUMNS = CREATE_COLUMNS.filter((col) => col !== 'id_empresa');

async function create(data) {
  const values = CREATE_COLUMNS.map((col) => data[col] ?? null);
  const placeholders = CREATE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO processos (${CREATE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id_processo`,
    values
  );
  return findById(rows[0].id_processo);
}

async function update(id, data, idEmpresa) {
  const values = UPDATE_COLUMNS.map((col) => data[col] ?? null);
  const params = [...values, id];
  let whereClause = `id_processo = $${params.length}`;
  if (idEmpresa !== undefined && idEmpresa !== null) {
    params.push(idEmpresa);
    whereClause += ` AND id_empresa = $${params.length}`;
  }
  const setClause = UPDATE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');

  await pool.query(`UPDATE processos SET ${setClause} WHERE ${whereClause}`, params);
  return findById(id, idEmpresa);
}

async function remove(id, idEmpresa) {
  const params = [id];
  let whereClause = 'id_processo = $1';
  if (idEmpresa !== undefined && idEmpresa !== null) {
    params.push(idEmpresa);
    whereClause += ` AND id_empresa = $${params.length}`;
  }
  const { rowCount } = await pool.query(`DELETE FROM processos WHERE ${whereClause}`, params);
  return rowCount > 0;
}

module.exports = { findAll, findById, findByNumero, create, update, remove };
