-- ============================================================
-- Migração: juiz que proferiu a decisão em cada pedido do processo
--
-- Para bancos criados ANTES desta coluna existir (bancos novos criados com
-- o schema.sql atual já a possuem). Idempotente: pode rodar mais de uma vez.
--   psql "$DATABASE_URL" -f database/migracao_pedido_juiz.sql
--
-- Pedidos de sentenças já analisadas ficam sem juiz (aparecem como "sem
-- juiz" na tela); para preencher, basta analisar a sentença novamente em um
-- processo novo, ou executar o UPDATE comentado no final.
-- ============================================================

ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS id_juiz INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_processo_pedidos_juiz'
    ) THEN
        ALTER TABLE processo_pedidos
            ADD CONSTRAINT fk_processo_pedidos_juiz
            FOREIGN KEY (id_juiz) REFERENCES juiz(id_juiz);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_processo_pedidos_juiz ON processo_pedidos(id_juiz);

-- Opcional: preencher o juiz dos pedidos que já têm resultado, a partir da
-- sentença mais recente analisada de cada processo.
-- UPDATE processo_pedidos pp
-- SET id_juiz = s.id_juiz
-- FROM (
--     SELECT DISTINCT ON (id_processo) id_processo, id_juiz
--     FROM sentenca
--     WHERE id_analise IS NOT NULL
--     ORDER BY id_processo, data_sentenca DESC NULLS LAST, id_sentenca DESC
-- ) s
-- WHERE s.id_processo = pp.id_processo AND pp.id_juiz IS NULL;
