// Tratamento centralizado de erros: nunca vaza stack trace ou detalhes
// internos ao cliente em produção.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || 500;

  console.error(`[erro] ${req.method} ${req.originalUrl} ->`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    error:
      isProduction && status === 500
        ? 'Ocorreu um erro interno. Tente novamente em alguns instantes.'
        : err.message,
  });
}

module.exports = errorHandler;
