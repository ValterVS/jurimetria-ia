import api from './api';

// filtros vazios ('' / null) não devem ir na query string
function limparFiltros(filtros = {}) {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}

export async function buscarResumoJurimetria(filtros = {}) {
  const { data } = await api.get('/jurimetria/resumo', { params: limparFiltros(filtros) });
  return data;
}

export async function buscarJurimetriaPorPedido(filtros = {}) {
  const { data } = await api.get('/jurimetria/pedidos', { params: limparFiltros(filtros) });
  return data;
}

export async function buscarJurimetriaPorJulgador(filtros = {}) {
  const { data } = await api.get('/jurimetria/julgadores', { params: limparFiltros(filtros) });
  return data;
}

export async function buscarJurimetriaDesembargadores(filtros = {}) {
  const { data } = await api.get('/jurimetria/desembargadores', { params: limparFiltros(filtros) });
  return data;
}

export async function buscarJurimetriaJuizes(filtros = {}) {
  const { data } = await api.get('/jurimetria/juizes', { params: limparFiltros(filtros) });
  return data;
}

export async function buscarJurimetriaPorTribunal(filtros = {}) {
  const { data } = await api.get('/jurimetria/tribunais', { params: limparFiltros(filtros) });
  return data;
}
