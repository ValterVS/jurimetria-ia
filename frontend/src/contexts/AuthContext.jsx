import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOKEN_STORAGE_KEY, EMPRESA_STORAGE_KEY } from '../services/api.js';
import { buscarEmpresaAtual } from '../services/auth.service.js';

const AuthContext = createContext(null);

function lerEmpresaSalva() {
  try {
    const raw = localStorage.getItem(EMPRESA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [empresa, setEmpresa] = useState(lerEmpresaSalva);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setCarregando(false);
      return;
    }
    // revalida a sessão com o backend ao carregar a aplicação
    buscarEmpresaAtual()
      .then((dados) => {
        setEmpresa(dados);
        localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(dados));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(EMPRESA_STORAGE_KEY);
        setEmpresa(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(({ token, empresa: empresaLogada }) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(empresaLogada));
    setEmpresa(empresaLogada);
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(EMPRESA_STORAGE_KEY);
    setEmpresa(null);
  }, []);

  const value = { empresa, autenticado: Boolean(empresa), carregando, entrar, sair };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de um AuthProvider.');
  return ctx;
}
