const SALT_ROUNDS = 10;

async function hashSenha(senha) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(senha, SALT_ROUNDS);
}

async function compararSenha(senha, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(senha, hash);
}

module.exports = { hashSenha, compararSenha };
