const { verificarToken } = require('../utils/jwt');
const { httpError } = require('../utils/httpError');

// Extrai e valida o JWT do header Authorization; anexa req.empresa com os
// dados da empresa logada (id_empresa, email, nome_empresa).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    next(httpError(401, 'Não autenticado. Faça login novamente.'));
    return;
  }

  try {
    const payload = verificarToken(token);
    req.empresa = { id_empresa: payload.id_empresa, email: payload.email, nome_empresa: payload.nome_empresa };
    next();
  } catch (error) {
    next(httpError(401, 'Sessão inválida ou expirada. Faça login novamente.'));
  }
}

module.exports = { requireAuth };
