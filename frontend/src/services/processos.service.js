import api from './api';

export async function listarProcessos(filtros = {}) {
  const { data } = await api.get('/processos', { params: filtros });
  return data;
}

export async function buscarProcesso(id) {
  const { data } = await api.get(`/processos/${id}`);
  return data;
}

export async function criarProcesso(payload) {
  const { data } = await api.post('/processos', payload);
  return data;
}

export async function atualizarProcesso(id, payload) {
  const { data } = await api.put(`/processos/${id}`, payload);
  return data;
}

export async function removerProcesso(id) {
  await api.delete(`/processos/${id}`);
}

// --- Partes vinculadas ao processo ---

export async function listarPartesDoProcesso(idProcesso) {
  const { data } = await api.get(`/processos/${idProcesso}/partes`);
  return data;
}

export async function vincularParteAoProcesso(idProcesso, payload) {
  const { data } = await api.post(`/processos/${idProcesso}/partes`, payload);
  return data;
}

export async function atualizarParteDoProcesso(idProcesso, idParte, payload) {
  const { data } = await api.put(`/processos/${idProcesso}/partes/${idParte}`, payload);
  return data;
}

export async function removerParteDoProcesso(idProcesso, idParte) {
  await api.delete(`/processos/${idProcesso}/partes/${idParte}`);
}

// --- Pedidos vinculados ao processo ---

export async function listarPedidosDoProcesso(idProcesso) {
  const { data } = await api.get(`/processos/${idProcesso}/pedidos`);
  return data;
}

export async function vincularPedidoAoProcesso(idProcesso, payload) {
  const { data } = await api.post(`/processos/${idProcesso}/pedidos`, payload);
  return data;
}

export async function atualizarPedidoDoProcesso(idProcesso, idVinculo, payload) {
  const { data } = await api.put(`/processos/${idProcesso}/pedidos/${idVinculo}`, payload);
  return data;
}

export async function removerPedidoDoProcesso(idProcesso, idVinculo) {
  await api.delete(`/processos/${idProcesso}/pedidos/${idVinculo}`);
}

// --- Sentenças e acórdãos do processo ---

export async function listarSentencasDoProcesso(idProcesso) {
  const { data } = await api.get(`/processos/${idProcesso}/sentencas`);
  return data;
}

export async function criarSentenca(idProcesso, payload) {
  const { data } = await api.post(`/processos/${idProcesso}/sentencas`, payload);
  return data;
}

export async function listarAcordaosDoProcesso(idProcesso) {
  const { data } = await api.get(`/processos/${idProcesso}/acordaos`);
  return data;
}

export async function criarAcordao(idProcesso, payload) {
  const { data } = await api.post(`/processos/${idProcesso}/acordaos`, payload);
  return data;
}
