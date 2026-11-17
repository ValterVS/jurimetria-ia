// Cria as tabelas no banco apontado por DATABASE_URL (ex: Supabase).
//   npm run db:setup          -> aplica database/schema.sql (só se o banco estiver vazio)
//   npm run db:seed           -> idem, e carrega os dados fictícios de demonstração
// Nunca apaga nada: se as tabelas já existem, avisa e não faz alterações.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const DB_DIR = path.resolve(__dirname, '../../database');
const comSeed = process.argv.includes('--seed');

function lerSql(nome) {
  return fs.readFileSync(path.join(DB_DIR, nome), 'utf8');
}

// No Supabase, tabelas do schema "public" ficam expostas pela API REST pública
// do projeto (chave anon) enquanto o RLS estiver desligado. O backend conecta
// direto no Postgres (role dona das tabelas, que ignora o RLS), então ligar o
// RLS sem políticas bloqueia o acesso externo sem afetar o sistema.
const ATIVAR_RLS = `
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;`;

async function protegerSupabase() {
  if (!/supabase\.(co|com)/i.test(process.env.DATABASE_URL)) return;
  await pool.query(ATIVAR_RLS);
  console.log('[db:setup] Supabase detectado: RLS ativado nas tabelas (bloqueia a API pública).');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida. Configure o backend/.env antes de rodar.');
  }

  const { rows } = await pool.query("SELECT to_regclass('public.empresa') AS tabela");
  if (rows[0].tabela) {
    console.log('[db:setup] As tabelas já existem neste banco - nada foi alterado.');
    if (comSeed) console.log('[db:setup] O seed só roda em banco recém-criado; ignorado.');
    await protegerSupabase();
    return;
  }

  console.log('[db:setup] Aplicando database/schema.sql ...');
  await pool.query(lerSql('schema.sql'));
  console.log('[db:setup] Tabelas criadas.');

  if (comSeed) {
    console.log('[db:setup] Carregando database/seed.sql (dados fictícios) ...');
    await pool.query(lerSql('seed.sql'));
    console.log('[db:setup] Dados de demonstração carregados.');
  }

  await protegerSupabase();
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('[db:setup] Falhou:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
