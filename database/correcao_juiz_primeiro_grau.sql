-- ============================================================
-- Correção: pedidos criados pelo acórdão ficaram sem o juiz de 1º grau.
-- Preenche id_juiz (juiz da sentença mais recente do processo) nos pedidos que
-- estão sem juiz. NÃO altera resultado_sentenca (continua em branco = "sem
-- resultado" para o juiz) nem pedidos que já têm juiz. Idempotente.
--   psql "$DATABASE_URL" -f database/correcao_juiz_primeiro_grau.sql
-- (ou cole no SQL Editor do Supabase)
-- ============================================================

UPDATE processo_pedidos pp
SET id_juiz = s.id_juiz
FROM (
    SELECT DISTINCT ON (id_processo) id_processo, id_juiz
    FROM sentenca
    ORDER BY id_processo, data_sentenca DESC NULLS LAST, id_sentenca DESC
) s
WHERE pp.id_processo = s.id_processo
  AND pp.id_juiz IS NULL;
