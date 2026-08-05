import api from './api';

export async function listarPedidos(filtros = {}) {
  const { data } = await api.get('/pedidos', { params: filtros });
  return data;
}

export async function buscarPedido(id) {
  const { data } = await api.get(`/pedidos/${id}`);
  return data;
}

export async function criarPedido(payload) {
  const { data } = await api.post('/pedidos', payload);
  return data;
}

export async function atualizarPedido(id, payload) {
  const { data } = await api.put(`/pedidos/${id}`, payload);
  return data;
}

export async function removerPedido(id) {
  await api.delete(`/pedidos/${id}`);
}
