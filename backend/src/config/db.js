// Pool de conexões PostgreSQL central. Usado por todos os repositories.
//
// SSL é habilitado automaticamente em produção porque provedores como
// Neon, Supabase e Railway exigem conexão criptografada. Em desenvolvimento
// local (Postgres sem SSL configurado), SSL fica desligado.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  // Erros em clientes ociosos do pool não devem derrubar o processo,
  // mas precisam ser visíveis no log.
  console.error('[db] Erro inesperado no pool de conexões:', err.message);
});

module.exports = pool;
