// Tratamento centralizado de erros. Regra de segurança: nunca vazar stack
// trace, mensagens internas do driver do banco ou qualquer dado sensível
// para o cliente em produção — só no log do servidor.
//
// Controllers/services devem lançar erros com `err.status` (ex: 400, 404)
// quando for um erro esperado (validação, recurso não encontrado etc).
// Sem `err.status`, é tratado como erro interno (500).
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
