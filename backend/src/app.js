const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// necessário atrás de proxy reverso (Render) para o rate limit funcionar
app.set('trust proxy', 1);

app.use(helmet());

// CORS: só as origens explicitamente configuradas. Nunca "*" em produção.
// FRONTEND_URL aceita mais de uma origem separada por vírgula; a barra final
// é ignorada (o navegador envia a origem sem ela).
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/+$/, '')),
  'http://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não autorizada pelo CORS.'));
    },
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
