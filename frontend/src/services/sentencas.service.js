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

// Envia a sentença para análise por IA. Aceita texto colado OU um arquivo
// (PDF/TXT/DOCX) - nunca os dois processados no frontend: o arquivo, quando
// presente, é enviado como multipart e o texto é extraído no backend.
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
