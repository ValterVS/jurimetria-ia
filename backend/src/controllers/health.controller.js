const pool = require('../config/db');

// GET /api/health
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
