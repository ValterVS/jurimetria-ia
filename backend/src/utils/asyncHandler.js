// Evita repetir try/catch em cada controller. Qualquer erro (síncrono ou
// de Promise rejeitada) dentro de `fn` é encaminhado para o
// middlewares/errorHandler.js central via next(err).
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
