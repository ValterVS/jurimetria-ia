const pool = require('../config/db');

async function create(idEmpresa, codigoHash, expiraEm) {
  const { rows } = await pool.query(
    `INSERT INTO verificacao_email (id_empresa, codigo_hash, expira_em)
     VALUES ($1, $2, $3) RETURNING id_verificacao`,
    [idEmpresa, codigoHash, expiraEm]
  );
  return rows[0].id_verificacao;
}

// pega a verificação válida mais recente (não usada, não expirada) para o código informado
async function findValida(idEmpresa, codigoHash) {
  const { rows } = await pool.query(
    `SELECT id_verificacao FROM verificacao_email
     WHERE id_empresa = $1 AND codigo_hash = $2 AND usado = FALSE AND expira_em > CURRENT_TIMESTAMP
     ORDER BY criado_em DESC LIMIT 1`,
    [idEmpresa, codigoHash]
  );
  return rows[0] || null;
}

async function marcarUsado(id) {
  await pool.query('UPDATE verificacao_email SET usado = TRUE WHERE id_verificacao = $1', [id]);
}

module.exports = { create, findValida, marcarUsado };
