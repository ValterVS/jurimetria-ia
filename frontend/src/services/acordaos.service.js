import api from './api';

export async function buscarAcordao(id) {
  const { data } = await api.get(`/acordaos/${id}`);
  return data;
}

export async function atualizarAcordao(id, payload) {
  const { data } = await api.put(`/acordaos/${id}`, payload);
  return data;
}

export async function removerAcordao(id) {
  await api.delete(`/acordaos/${id}`);
}

export async function analisarAcordao(id, { texto, arquivo } = {}) {
  if (arquivo) {
    const formData = new FormData();
    if (texto) formData.append('texto', texto);
    formData.append('arquivo', arquivo);
    const { data } = await api.post(`/acordaos/${id}/analisar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post(`/acordaos/${id}/analisar`, { texto });
  return data;
}
