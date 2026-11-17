// Pool de conexões PostgreSQL central, usado por todos os repositories.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool de conexões:', err.message);
});

module.exports = pool;
