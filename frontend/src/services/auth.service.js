import api from './api';

export async function cadastrar(payload) {
  const { data } = await api.post('/auth/cadastro', payload);
  return data;
}

export async function verificarEmail(payload) {
  const { data } = await api.post('/auth/verificar-email', payload);
  return data;
}

export async function reenviarCodigo(payload) {
  const { data } = await api.post('/auth/reenviar-codigo', payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function esqueciSenha(payload) {
  const { data } = await api.post('/auth/esqueci-senha', payload);
  return data;
}

export async function redefinirSenha(payload) {
  const { data } = await api.post('/auth/redefinir-senha', payload);
  return data;
}

export async function buscarEmpresaAtual() {
  const { data } = await api.get('/auth/me');
  return data;
}
