import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração padrão do Vite para React. A URL da API nunca é
// hardcoded aqui - vem sempre de VITE_API_URL (ver src/services/api.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
