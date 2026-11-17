const { httpError } = require('./httpError');

const DEFAULT_EXPIRES_IN = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw httpError(503, 'JWT_SECRET não configurada no servidor.');
  }
  return secret;
}

function gerarToken(payload) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN });
}

function verificarToken(token) {
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, getSecret());
}

module.exports = { gerarToken, verificarToken };
