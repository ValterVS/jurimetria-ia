// helper para criar erros HTTP com status explícito
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { httpError };
