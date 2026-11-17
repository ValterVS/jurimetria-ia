const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    ad.id_analise, ad.id_status_analise, sa.tipo_analise AS status,
    ad.plataforma_utilizada, ad.input_tokens, ad.output_tokens,
    ad.insights_json, ad.data_processamento, ad.erro_log
  FROM analise_decisao ad
  JOIN status_analise sa ON sa.id_status_analise = ad.id_status_analise
`;

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE ad.id_analise = $1`, [id]);
  return rows[0] || null;
}

// análise não tem id_processo direto - pertence a uma sentença OU a um
// acórdão, cada um vinculado a um processo. Usado só para checar posse
// (empresa dona do processo) antes de expor a análise pelo id.
async function findEmpresaId(id) {
  const { rows } = await pool.query(
    `SELECT p.id_empresa FROM sentenca s JOIN processos p ON p.id_processo = s.id_processo WHERE s.id_analise = $1
     UNION
     SELECT p.id_empresa FROM acordao a JOIN processos p ON p.id_processo = a.id_processo WHERE a.id_analise = $1`,
    [id]
  );
  return rows[0]?.id_empresa ?? null;
}

// cria a análise já como 'Pendente' (DEFAULT da coluna id_status_analise)
async function create() {
  const { rows } = await pool.query('INSERT INTO analise_decisao DEFAULT VALUES RETURNING id_analise');
  return findById(rows[0].id_analise);
}

async function updateStatus(id, statusLabel) {
  await pool.query(
    `UPDATE analise_decisao
     SET id_status_analise = (SELECT id_status_analise FROM status_analise WHERE tipo_analise = $1)
     WHERE id_analise = $2`,
    [statusLabel, id]
  );
  return findById(id);
}

async function markConcluida(id, { insightsJson, inputTokens, outputTokens, plataforma }) {
  await pool.query(
    `UPDATE analise_decisao
     SET id_status_analise = (SELECT id_status_analise FROM status_analise WHERE tipo_analise = 'Concluída'),
         insights_json = $1,
         input_tokens = $2,
         output_tokens = $3,
         plataforma_utilizada = $4,
         data_processamento = CURRENT_TIMESTAMP,
         erro_log = NULL
     WHERE id_analise = $5`,
    [insightsJson, inputTokens, outputTokens, plataforma, id]
  );
  return findById(id);
}

async function markErro(id, erroLog) {
  await pool.query(
    `UPDATE analise_decisao
     SET id_status_analise = (SELECT id_status_analise FROM status_analise WHERE tipo_analise = 'Erro'),
         erro_log = $1,
         data_processamento = CURRENT_TIMESTAMP
     WHERE id_analise = $2`,
    [erroLog, id]
  );
  return findById(id);
}

module.exports = { findById, findEmpresaId, create, updateStatus, markConcluida, markErro };
