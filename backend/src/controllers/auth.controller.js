const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const cadastrar = asyncHandler(async (req, res) => {
  const resultado = await authService.cadastrar(req.body);
  res.status(201).json(resultado);
});

const verificarEmail = asyncHandler(async (req, res) => {
  const resultado = await authService.verificarEmail(req.body);
  res.json(resultado);
});

const reenviarCodigo = asyncHandler(async (req, res) => {
  await authService.reenviarCodigo(req.body);
  res.json({ message: 'Código reenviado.' });
});

const login = asyncHandler(async (req, res) => {
  const resultado = await authService.login(req.body);
  res.json(resultado);
});

const esqueciSenha = asyncHandler(async (req, res) => {
  await authService.esqueciSenha(req.body);
  res.json({ message: 'Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.' });
});

const redefinirSenha = asyncHandler(async (req, res) => {
  await authService.redefinirSenha(req.body);
  res.json({ message: 'Senha redefinida com sucesso.' });
});

const me = asyncHandler(async (req, res) => {
  const empresa = await authService.getEmpresaAtual(req.empresa.id_empresa);
  res.json(empresa);
});

module.exports = { cadastrar, verificarEmail, reenviarCodigo, login, esqueciSenha, redefinirSenha, me };
