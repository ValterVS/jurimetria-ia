const { httpError } = require('../utils/httpError');

// Middleware de validação de entrada baseado em schemas Zod.
// `source` indica qual parte da requisição validar: 'body' (padrão),
// 'query' (filtros de listagem) ou 'params' (parâmetros de rota).
// Em caso de sucesso, substitui req[source] pelo dado já validado/tipado
// (Zod faz coerção, ex: string -> number quando o schema pede number).
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || source}: ${issue.message}`)
        .join('; ');
      next(httpError(400, `Dados inválidos - ${message}`));
      return;
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
