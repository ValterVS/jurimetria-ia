const pool = require('../config/db');

const SELECT_BASE = `
  SELECT id_empresa, cnpj, nome_empresa, nome_responsavel, cpf_responsavel,
         email, senha_hash, email_verificado, criado_em
  FROM empresa
`;

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE id_empresa = $1`, [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findByCnpj(cnpj) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE cnpj = $1`, [cnpj]);
  return rows[0] || null;
}

async function create({ cnpj, nome_empresa, nome_responsavel, cpf_responsavel, email, senha_hash }) {
  const { rows } = await pool.query(
    `INSERT INTO empresa (cnpj, nome_empresa, nome_responsavel, cpf_responsavel, email, senha_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_empresa`,
    [cnpj, nome_empresa, nome_responsavel, cpf_responsavel, email, senha_hash]
  );
  return findById(rows[0].id_empresa);
}

async function marcarEmailVerificado(id) {
  await pool.query('UPDATE empresa SET email_verificado = TRUE WHERE id_empresa = $1', [id]);
  return findById(id);
}

async function atualizarSenha(id, senha_hash) {
  await pool.query('UPDATE empresa SET senha_hash = $1 WHERE id_empresa = $2', [senha_hash, id]);
}

module.exports = { findById, findByEmail, findByCnpj, create, marcarEmailVerificado, atualizarSenha };
