import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'jurimetria_token';
export const EMPRESA_STORAGE_KEY = 'jurimetria_empresa';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000,
});

// anexa o token da empresa logada (se houver) em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// toda falha vira uma `friendlyMessage` em português para exibição na tela
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

      // token ausente/expirado/inválido em uma rota protegida: limpa a sessão
      // e manda para o login, exceto quando o próprio /auth/login falhou
      // (aí o erro 401 é "e-mail ou senha inválidos", não sessão expirada)
      if (error.response.status === 401 && !error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(EMPRESA_STORAGE_KEY);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
