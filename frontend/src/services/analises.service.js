import api from './api';

export async function buscarAnalise(id) {
  const { data } = await api.get(`/analises/${id}`);
  return data;
}
