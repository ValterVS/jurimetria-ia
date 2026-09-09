import api from './api';

export async function buscarResumoJurimetria(filtros = {}) {
  const { data } = await api.get('/jurimetria/resumo', { params: filtros });
  return data;
}

export async function buscarJurimetriaPorPedido(filtros = {}) {
  const { data } = await api.get('/jurimetria/pedidos', { params: filtros });
  return data;
}

export async function buscarJurimetriaPorJulgador(filtros = {}) {
  const { data } = await api.get('/jurimetria/julgadores', { params: filtros });
  return data;
}

export async function buscarJurimetriaPorTribunal(filtros = {}) {
  const { data } = await api.get('/jurimetria/tribunais', { params: filtros });
  return data;
}
