const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Necessário quando atrás de proxy reverso (Render) para que o
// express-rate-limit identifique o IP real do cliente corretamente.
app.set('trust proxy', 1);

app.use(helmet());

// CORS: só as origens explicitamente configuradas. Nunca "*" em produção.
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem "origin" (ex: curl, health checks server-to-server)
      // são permitidas; requisições de browser sempre mandam origin.
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

// Rate limiting básico para toda a API. Endpoints mais sensíveis
// (ex: disparo de análise por IA) podem receber limites próprios
// nas fases seguintes.
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
