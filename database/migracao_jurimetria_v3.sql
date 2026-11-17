-- ============================================================
-- Migração: fundamentação por pedido (jurimetria "por que decidiu assim")
-- Idempotente. Rode depois de migracao_pedidos_v2.sql:
--   psql "$DATABASE_URL" -f database/migracao_jurimetria_v3.sql
--
-- Guarda, em cada pedido do processo, o resumo da fundamentação da sentença
-- e do acórdão (extraído pela IA). O UPDATE final copia essas fundamentações
-- das análises JÁ FEITAS (insights_json), casando o pedido pelo nome.
-- ============================================================

BEGIN;

ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS fundamentacao_sentenca TEXT;
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS fundamentacao_acordao TEXT;

-- sentenças já analisadas
UPDATE processo_pedidos pp
SET fundamentacao_sentenca = origem.fundamentacao
FROM (
    SELECT s.id_processo,
           lower(trim(e->>'nome')) AS nome,
           lower(trim(COALESCE(e->>'descricao', ''))) AS descricao,
           e->>'fundamentacao_resumida' AS fundamentacao
    FROM sentenca s
    JOIN analise_decisao ad ON ad.id_analise = s.id_analise
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ad.insights_json->'pedidos', '[]'::jsonb)) e
) origem
JOIN pedidos pe ON lower(trim(pe.nome_pedido)) = origem.nome
WHERE pp.id_pedido = pe.id_pedido
  AND pp.id_processo = origem.id_processo
  AND pp.fundamentacao_sentenca IS NULL
  AND origem.fundamentacao IS NOT NULL
  AND (origem.descricao = '' OR origem.descricao = lower(trim(COALESCE(pp.descricao, ''))));

-- acórdãos já analisados
UPDATE processo_pedidos pp
SET fundamentacao_acordao = origem.fundamentacao
FROM (
    SELECT a.id_processo,
           lower(trim(e->>'nome')) AS nome,
           lower(trim(COALESCE(e->>'descricao', ''))) AS descricao,
           e->>'fundamentacao_resumida' AS fundamentacao
    FROM acordao a
    JOIN analise_decisao ad ON ad.id_analise = a.id_analise
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ad.insights_json->'pedidos', '[]'::jsonb)) e
) origem
JOIN pedidos pe ON lower(trim(pe.nome_pedido)) = origem.nome
WHERE pp.id_pedido = pe.id_pedido
  AND pp.id_processo = origem.id_processo
  AND pp.fundamentacao_acordao IS NULL
  AND origem.fundamentacao IS NOT NULL
  AND (origem.descricao = '' OR origem.descricao = lower(trim(COALESCE(pp.descricao, ''))));

COMMIT;
