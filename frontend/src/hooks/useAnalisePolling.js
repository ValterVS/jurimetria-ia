import { useCallback, useEffect, useRef, useState } from 'react';

const STATUS_EM_ANDAMENTO = ['Pendente', 'Em Análise'];

// Faz polling de GET /api/analises/:id enquanto o status estiver
// Pendente ou Em Análise, parando automaticamente ao chegar em
// Concluída ou Erro (fluxo assíncrono descrito na seção 17 do escopo).
export function useAnalisePolling(id, buscarAnalise, { intervalMs = 3000 } = {}) {
  const [analise, setAnalise] = useState(null);
  const [erro, setErro] = useState(null);
  const timerRef = useRef(null);

  const buscar = useCallback(async () => {
    try {
      const dados = await buscarAnalise(id);
      setAnalise(dados);
      setErro(null);
      return dados;
    } catch (err) {
      setErro(err.friendlyMessage || 'Erro ao consultar a análise.');
      return null;
    }
  }, [id, buscarAnalise]);

  useEffect(() => {
    let cancelado = false;

    async function tick() {
      const dados = await buscar();
      if (cancelado) return;
      if (dados && STATUS_EM_ANDAMENTO.includes(dados.status)) {
        timerRef.current = setTimeout(tick, intervalMs);
      }
    }

    tick();

    return () => {
      cancelado = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [buscar, intervalMs]);

  return { analise, erro };
}
