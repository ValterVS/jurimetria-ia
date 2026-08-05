require('dotenv').config();

const app = require('./app');
const { validateEnv } = require('./config/env');

validateEnv();

// Nunca fixar a porta: em produção (Render) a plataforma injeta PORT.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`[jurimetria-api] rodando na porta ${PORT} (${env})`);
});
