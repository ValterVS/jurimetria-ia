import { useCallback, useEffect, useState } from 'react';

// Hook genérico de data-fetching: chama `fetchFn` sempre que algo em `deps`
// mudar, expondo {data, loading, error, reload}. `error` já vem traduzido
// para uma mensagem amigável (ver interceptor em services/api.js).
export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.friendlyMessage || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
