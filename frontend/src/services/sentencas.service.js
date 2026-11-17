import api from './api';

export async function buscarSentenca(id) {
  const { data } = await api.get(`/sentencas/${id}`);
  return data;
}

export async function atualizarSentenca(id, payload) {
  const { data } = await api.put(`/sentencas/${id}`, payload);
  return data;
}

export async function removerSentenca(id) {
  await api.delete(`/sentencas/${id}`);
}

// aceita texto colado ou um arquivo (PDF/TXT/DOCX)
export async function analisarSentenca(id, { texto, arquivo } = {}) {
  if (arquivo) {
    const formData = new FormData();
    if (texto) formData.append('texto', texto);
    formData.append('arquivo', arquivo);
    const { data } = await api.post(`/sentencas/${id}/analisar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post(`/sentencas/${id}/analisar`, { texto });
  return data;
}
