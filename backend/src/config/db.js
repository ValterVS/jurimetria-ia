// Pool de conexões PostgreSQL central, usado por todos os repositories.
const { Pool } = require('pg');

// SSL: Supabase (e a maioria dos bancos em nuvem) exige conexão criptografada.
// DB_SSL=true/false decide explicitamente; sem ela, liga só em produção.
function usarSsl() {
  if (process.env.DB_SSL !== undefined && process.env.DB_SSL !== '') {
    return process.env.DB_SSL.toLowerCase() === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSsl() ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool de conexões:', err.message);
});

module.exports = pool;
