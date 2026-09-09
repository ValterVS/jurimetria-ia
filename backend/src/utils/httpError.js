// Helper para criar erros HTTP com status explícito, consumidos pelo
// middlewares/errorHandler.js. Evita repetir `const e = new Error(...); e.status = x;`
// em todo service/controller.
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { httpError };
