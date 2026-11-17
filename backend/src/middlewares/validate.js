const { httpError } = require('../utils/httpError');

// Middleware de validação com Zod. `source`: 'body' | 'query' | 'params'.
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
