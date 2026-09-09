const pool = require('../config/db');

// GET /api/health
// Usado para checar rapidamente se o backend está no ar durante
// apresentações e testes (inclusive após cold start em plano gratuito).
// Não expõe detalhes de configuração nem mensagens de erro do banco.
async function getHealth(req, res) {
  const response = {
    status: 'ok',
    service: 'jurimetria-api',
  };

  try {
    await pool.query('SELECT 1');
    response.database = 'connected';
  } catch (error) {
    response.database = 'unavailable';
  }

  res.status(200).json(response);
}

module.exports = { getHealth };
