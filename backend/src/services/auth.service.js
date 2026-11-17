const empresaRepository = require('../repositories/empresa.repository');
const verificacaoEmailRepository = require('../repositories/verificacaoEmail.repository');
const redefinicaoSenhaRepository = require('../repositories/redefinicaoSenha.repository');
const { hashSenha, compararSenha } = require('../utils/password');
const { gerarCodigoVerificacao, gerarTokenAleatorio, hashToken } = require('../utils/token');
const { gerarToken } = require('../utils/jwt');
const { enviarCodigoVerificacao, enviarLinkRedefinicaoSenha } = require('./email.service');
const { httpError } = require('../utils/httpError');

const CODIGO_VALIDADE_MINUTOS = 15;
const TOKEN_RESET_VALIDADE_MINUTOS = 60;

function daquiAMinutos(minutos) {
  return new Date(Date.now() + minutos * 60 * 1000);
}

function empresaPublica(empresa) {
  return {
    id_empresa: empresa.id_empresa,
    cnpj: empresa.cnpj,
    nome_empresa: empresa.nome_empresa,
    nome_responsavel: empresa.nome_responsavel,
    cpf_responsavel: empresa.cpf_responsavel,
    email: empresa.email,
    email_verificado: empresa.email_verificado,
  };
}

function emitirToken(empresa) {
  return gerarToken({ id_empresa: empresa.id_empresa, email: empresa.email, nome_empresa: empresa.nome_empresa });
}

async function gerarEEnviarCodigo(empresa) {
  const codigo = gerarCodigoVerificacao();
  await verificacaoEmailRepository.create(empresa.id_empresa, hashToken(codigo), daquiAMinutos(CODIGO_VALIDADE_MINUTOS));
  await enviarCodigoVerificacao(empresa, codigo);
}

async function cadastrar({ cnpj, nome_empresa, nome_responsavel, cpf_responsavel, email, senha }) {
  const cnpjDigitos = cnpj.replace(/\D/g, '');
  const cpfDigitos = cpf_responsavel.replace(/\D/g, '');

  if (await empresaRepository.findByEmail(email)) {
    throw httpError(409, 'Já existe uma empresa cadastrada com este e-mail.');
  }
  if (await empresaRepository.findByCnpj(cnpjDigitos)) {
    throw httpError(409, 'Já existe uma empresa cadastrada com este CNPJ.');
  }

  const senha_hash = await hashSenha(senha);
  const empresa = await empresaRepository.create({
    cnpj: cnpjDigitos,
    nome_empresa,
    nome_responsavel,
    cpf_responsavel: cpfDigitos,
    email,
    senha_hash,
  });

  try {
    await gerarEEnviarCodigo(empresa);
  } catch (error) {
    // a empresa já foi criada (nunca perdemos o cadastro); o código pode
    // ser reenviado depois de configurado o envio de e-mail no servidor
    throw httpError(
      error.status || 502,
      `Cadastro criado, mas não foi possível enviar o e-mail de verificação agora (${error.message}). Use "reenviar código" depois.`
    );
  }

  return { id_empresa: empresa.id_empresa, email: empresa.email };
}

async function verificarEmail({ email, codigo }) {
  const empresa = await empresaRepository.findByEmail(email);
  if (!empresa) {
    throw httpError(404, 'E-mail não encontrado.');
  }
  if (empresa.email_verificado) {
    throw httpError(409, 'Este e-mail já foi verificado. Faça login normalmente.');
  }

  const verificacao = await verificacaoEmailRepository.findValida(empresa.id_empresa, hashToken(codigo));
  if (!verificacao) {
    throw httpError(400, 'Código inválido ou expirado.');
  }

  await verificacaoEmailRepository.marcarUsado(verificacao.id_verificacao);
  const empresaAtualizada = await empresaRepository.marcarEmailVerificado(empresa.id_empresa);

  return { empresa: empresaPublica(empresaAtualizada), token: emitirToken(empresaAtualizada) };
}

async function reenviarCodigo({ email }) {
  const empresa = await empresaRepository.findByEmail(email);
  if (!empresa) {
    throw httpError(404, 'E-mail não encontrado.');
  }
  if (empresa.email_verificado) {
    throw httpError(409, 'Este e-mail já foi verificado. Faça login normalmente.');
  }

  await gerarEEnviarCodigo(empresa);
}

async function login({ email, senha }) {
  const empresa = await empresaRepository.findByEmail(email);
  if (!empresa) {
    throw httpError(401, 'E-mail ou senha inválidos.');
  }

  const senhaCorreta = await compararSenha(senha, empresa.senha_hash);
  if (!senhaCorreta) {
    throw httpError(401, 'E-mail ou senha inválidos.');
  }

  if (!empresa.email_verificado) {
    throw httpError(403, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada ou peça um novo código.');
  }

  return { empresa: empresaPublica(empresa), token: emitirToken(empresa) };
}

async function esqueciSenha({ email }) {
  const empresa = await empresaRepository.findByEmail(email);
  // sempre retorna silenciosamente quando o e-mail não existe, para não
  // revelar quais e-mails estão cadastrados no sistema
  if (!empresa) return;

  const token = gerarTokenAleatorio();
  await redefinicaoSenhaRepository.create(empresa.id_empresa, hashToken(token), daquiAMinutos(TOKEN_RESET_VALIDADE_MINUTOS));

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${baseUrl}/redefinir-senha?token=${token}`;
  await enviarLinkRedefinicaoSenha(empresa, link);
}

async function redefinirSenha({ token, senha }) {
  const redefinicao = await redefinicaoSenhaRepository.findValido(hashToken(token));
  if (!redefinicao) {
    throw httpError(400, 'Link de redefinição inválido ou expirado. Solicite um novo.');
  }

  const senha_hash = await hashSenha(senha);
  await empresaRepository.atualizarSenha(redefinicao.id_empresa, senha_hash);
  await redefinicaoSenhaRepository.marcarUsado(redefinicao.id_redefinicao);
}

async function getEmpresaAtual(idEmpresa) {
  const empresa = await empresaRepository.findById(idEmpresa);
  if (!empresa) {
    throw httpError(404, 'Empresa não encontrada.');
  }
  return empresaPublica(empresa);
}

module.exports = {
  cadastrar,
  verificarEmail,
  reenviarCodigo,
  login,
  esqueciSenha,
  redefinirSenha,
  getEmpresaAtual,
};
