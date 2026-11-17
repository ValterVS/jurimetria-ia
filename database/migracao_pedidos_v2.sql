-- ============================================================
-- Migração: pedidos do processo com 1º e 2º grau + pedidos repetidos
--
-- Para bancos criados ANTES destas mudanças (banco novo já nasce assim pelo
-- schema.sql). Substitui o arquivo migracao_pedido_juiz.sql (se você já
-- rodou aquele, pode rodar este mesmo assim). Idempotente.
--   psql "$DATABASE_URL" -f database/migracao_pedidos_v2.sql
--
-- O que muda em processo_pedidos:
--   - id_processo_pedido: chave própria (permite o mesmo pedido mais de uma
--     vez no processo, com fundamentos diferentes)
--   - descricao: fundamento que diferencia pedidos de mesmo nome
--   - id_juiz / resultado_sentenca: juiz e resultado da SENTENÇA (1º grau)
--   - id_desembargador / resultado_acordao: relator e resultado do ACÓRDÃO
--   - reformado: o acórdão mudou o resultado dado pela sentença
-- ============================================================

BEGIN;

ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS descricao VARCHAR(300);
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS id_juiz INTEGER;
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS resultado_sentenca VARCHAR(25);
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS id_desembargador INTEGER;
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS resultado_acordao VARCHAR(25);
ALTER TABLE processo_pedidos ADD COLUMN IF NOT EXISTS reformado BOOLEAN;

DO $$
BEGIN
    -- chave própria no lugar da chave composta (id_processo, id_pedido)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'processo_pedidos' AND column_name = 'id_processo_pedido'
    ) THEN
        ALTER TABLE processo_pedidos DROP CONSTRAINT IF EXISTS pk_processo_pedidos;
        ALTER TABLE processo_pedidos ADD COLUMN id_processo_pedido INTEGER GENERATED ALWAYS AS IDENTITY;
        ALTER TABLE processo_pedidos ADD CONSTRAINT pk_processo_pedidos PRIMARY KEY (id_processo_pedido);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_processo_pedidos_juiz') THEN
        ALTER TABLE processo_pedidos ADD CONSTRAINT fk_processo_pedidos_juiz
            FOREIGN KEY (id_juiz) REFERENCES juiz(id_juiz);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_processo_pedidos_desembargador') THEN
        ALTER TABLE processo_pedidos ADD CONSTRAINT fk_processo_pedidos_desembargador
            FOREIGN KEY (id_desembargador) REFERENCES desembargador(id_desembargador);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_processo_pedidos_resultado_sentenca') THEN
        ALTER TABLE processo_pedidos ADD CONSTRAINT ck_processo_pedidos_resultado_sentenca
            CHECK (resultado_sentenca IN ('procedente', 'improcedente', 'parcialmente_procedente'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_processo_pedidos_resultado_acordao') THEN
        ALTER TABLE processo_pedidos ADD CONSTRAINT ck_processo_pedidos_resultado_acordao
            CHECK (resultado_acordao IN ('procedente', 'improcedente', 'parcialmente_procedente'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_processo_pedidos_descricao
    ON processo_pedidos (id_processo, id_pedido, lower(COALESCE(descricao, '')));
CREATE INDEX IF NOT EXISTS idx_processo_pedidos_juiz   ON processo_pedidos(id_juiz);
CREATE INDEX IF NOT EXISTS idx_processo_pedidos_desemb ON processo_pedidos(id_desembargador);

-- Pedidos que já tinham juiz (sentença analisada) passam a ter o resultado
-- de 1º grau igual ao resultado que já estava gravado.
UPDATE processo_pedidos
SET resultado_sentenca = resultado
WHERE id_juiz IS NOT NULL AND resultado_sentenca IS NULL;

COMMIT;
