import axios from 'axios';

// Nunca hardcodar localhost aqui - a URL do backend vem sempre de uma
// variável de ambiente injetada em build-time pelo Vite (seção 21 do escopo).
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000,
});

// Toda falha vira uma `friendlyMessage` em português, para que as telas
// nunca precisem exibir stack trace / erro técnico cru ao usuário
// (mesmo princípio do errorHandler centralizado do backend).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage =
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    } else {
      error.friendlyMessage =
        error.response.data?.error ||
        error.response.data?.message ||
        'Ocorreu um erro inesperado. Tente novamente.';
    }
    return Promise.reject(error);
  }
);

export default api;
