// Cria uma conta de empresa JÁ VERIFICADA (sem depender de e-mail), útil para
// deixar um login pronto na apresentação.
//   npm run empresa:criar -- --email demo@exemplo.com --senha MinhaSenha123 --nome "Escritório Demo" [--vincular-seed]
// --vincular-seed passa os processos de demonstração (seed.sql) para esta conta.
require('dotenv').config();
const pool = require('../src/config/db');
const { hashSenha } = require('../src/utils/password');

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

async function main() {
  const email = arg('email');
  const senha = arg('senha');
  const nome = arg('nome', 'Escritório Demonstração');
  const cnpj = arg('cnpj', '11222333000181').replace(/\D/g, '');
  const cpf = arg('cpf', '11144477735').replace(/\D/g, '');
  const responsavel = arg('responsavel', 'Responsável Demonstração');

  if (!email || !senha) {
    throw new Error('Informe --email e --senha. Ex: npm run empresa:criar -- --email demo@exemplo.com --senha Senha123');
  }
  if (senha.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');

  const existente = await pool.query('SELECT 1 FROM empresa WHERE email = $1 OR cnpj = $2', [email, cnpj]);
  if (existente.rowCount > 0) throw new Error('Já existe uma empresa com esse e-mail ou CNPJ (use outro --cnpj).');

  const hash = await hashSenha(senha);
  const { rows } = await pool.query(
    `INSERT INTO empresa (cnpj, nome_empresa, nome_responsavel, cpf_responsavel, email, senha_hash, email_verificado)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id_empresa`,
    [cnpj, nome, responsavel, cpf, email, hash]
  );
  const idEmpresa = rows[0].id_empresa;
  console.log(`[empresa:criar] Conta criada (id ${idEmpresa}) e já verificada: ${email}`);

  if (process.argv.includes('--vincular-seed')) {
    const r = await pool.query(
      `UPDATE processos SET id_empresa = $1
       WHERE id_empresa = (SELECT id_empresa FROM empresa WHERE email = 'seed@jurimetria.local')`,
      [idEmpresa]
    );
    console.log(`[empresa:criar] ${r.rowCount} processo(s) de demonstração vinculado(s) a esta conta.`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('[empresa:criar] Falhou:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
