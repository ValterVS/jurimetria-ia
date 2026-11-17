const pool = require('../config/db');

async function create(idEmpresa, tokenHash, expiraEm) {
  await pool.query(
    `INSERT INTO redefinicao_senha (id_empresa, token_hash, expira_em)
     VALUES ($1, $2, $3)`,
    [idEmpresa, tokenHash, expiraEm]
  );
}

async function findValido(tokenHash) {
  const { rows } = await pool.query(
    `SELECT id_redefinicao, id_empresa FROM redefinicao_senha
     WHERE token_hash = $1 AND usado = FALSE AND expira_em > CURRENT_TIMESTAMP`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function marcarUsado(id) {
  await pool.query('UPDATE redefinicao_senha SET usado = TRUE WHERE id_redefinicao = $1', [id]);
}

module.exports = { create, findValido, marcarUsado };
