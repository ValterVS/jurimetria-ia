import api from './api';

export async function listarPartes(filtros = {}) {
  const { data } = await api.get('/partes', { params: filtros });
  return data;
}

export async function buscarParte(id) {
  const { data } = await api.get(`/partes/${id}`);
  return data;
}

export async function criarParte(payload) {
  const { data } = await api.post('/partes', payload);
  return data;
}

export async function atualizarParte(id, payload) {
  const { data } = await api.put(`/partes/${id}`, payload);
  return data;
}

export async function removerParte(id) {
  await api.delete(`/partes/${id}`);
}
