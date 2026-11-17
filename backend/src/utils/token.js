const crypto = require('crypto');

// código numérico de 6 dígitos (2FA por e-mail no cadastro)
function gerarCodigoVerificacao() {
  return String(crypto.randomInt(100000, 1000000));
}

// token opaco para o link de redefinição de senha
function gerarTokenAleatorio() {
  return crypto.randomBytes(32).toString('hex');
}

// nunca persistimos o código/token em texto puro, só o hash
function hashToken(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

module.exports = { gerarCodigoVerificacao, gerarTokenAleatorio, hashToken };
