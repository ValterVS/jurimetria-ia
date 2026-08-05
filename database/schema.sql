-- ============================================================
-- Sistema de Análise de Processos Judiciais e Indicadores de Jurimetria
-- database/schema.sql
--
-- Baseado no script original fornecido pelos autores (Banco_Dados_V2.sql).
-- Este arquivo contém a versão FUNCIONAL e CORRIGIDA do banco.
-- Toda correção em relação ao script original está documentada,
-- com justificativa, em database/README.md.
--
-- Pode ser executado do zero em uma instância PostgreSQL vazia.
-- ============================================================

-- ==========================
-- 1. Catálogos institucionais
-- ==========================

CREATE TABLE tribunal (
    id_tribunal     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_tribunal   VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE comarca (
    id_comarca      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_comarca    VARCHAR(100) NOT NULL,
    id_tribunal     INTEGER NOT NULL,

    CONSTRAINT fk_comarca_tribunal
        FOREIGN KEY (id_tribunal)
        REFERENCES tribunal(id_tribunal)
);

CREATE TABLE vara (
    id_vara         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_vara       VARCHAR(100) NOT NULL,
    id_comarca      INTEGER NOT NULL,

    CONSTRAINT fk_vara_comarca
        FOREIGN KEY (id_comarca)
        REFERENCES comarca(id_comarca)
);

CREATE TABLE juiz (
    id_juiz         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_juiz       VARCHAR(120) NOT NULL,
    id_vara         INTEGER,

    CONSTRAINT fk_juiz_vara
        FOREIGN KEY (id_vara)
        REFERENCES vara(id_vara)
);

CREATE TABLE desembargador (
    id_desembargador   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_desembargador VARCHAR(120) NOT NULL,
    id_tribunal         INTEGER,

    CONSTRAINT fk_desembargador_tribunal
        FOREIGN KEY (id_tribunal)
        REFERENCES tribunal(id_tribunal)
);

CREATE TABLE ministro (
    id_ministro     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_ministro   VARCHAR(120) NOT NULL,
    id_tribunal     INTEGER,

    CONSTRAINT fk_ministro_tribunal
        FOREIGN KEY (id_tribunal)
        REFERENCES tribunal(id_tribunal)
);

-- ==========================
-- 2. Situação do processo
-- [CORREÇÃO] Tabela nova. Não existia em nenhum documento original
-- (SQL, diagramas ou UML), mas processos.id_situacao é NOT NULL e o
-- dashboard exige "processos por situação". Ver database/README.md, item 3.
-- ==========================

CREATE TABLE situacao_processo (
    id_situacao     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_situacao   VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO situacao_processo (nome_situacao)
VALUES ('Em andamento'), ('Suspenso'), ('Arquivado'), ('Encerrado');

-- ==========================
-- 3. Processos
-- ==========================

CREATE TABLE processos (
    id_processo         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_processo     VARCHAR(48) UNIQUE NOT NULL,
    categoria           VARCHAR(25),
    id_tribunal         INTEGER NOT NULL,
    id_comarca          INTEGER NOT NULL,
    id_vara             INTEGER NOT NULL,
    data_distribuicao   DATE NOT NULL,
    valor_causa         NUMERIC(15,2),
    id_situacao         INTEGER NOT NULL,
    id_juiz              INTEGER,
    id_desembargador     INTEGER,
    id_ministro          INTEGER,

    CONSTRAINT fk_processo_tribunal
        FOREIGN KEY (id_tribunal) REFERENCES tribunal(id_tribunal),

    CONSTRAINT fk_processo_comarca
        FOREIGN KEY (id_comarca) REFERENCES comarca(id_comarca),

    CONSTRAINT fk_processo_vara
        FOREIGN KEY (id_vara) REFERENCES vara(id_vara),

    -- [CORREÇÃO] FK que não existia (não havia tabela situacao). Ver README, item 3.
    CONSTRAINT fk_processo_situacao
        FOREIGN KEY (id_situacao) REFERENCES situacao_processo(id_situacao),

    CONSTRAINT fk_processo_juiz
        FOREIGN KEY (id_juiz) REFERENCES juiz(id_juiz),

    CONSTRAINT fk_processo_desembargador
        FOREIGN KEY (id_desembargador) REFERENCES desembargador(id_desembargador),

    CONSTRAINT fk_processo_ministro
        FOREIGN KEY (id_ministro) REFERENCES ministro(id_ministro)
);

-- ==========================
-- 4. Partes
-- ==========================

CREATE TABLE partes (
    id_parte    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_parte  VARCHAR(200) NOT NULL,
    cpf_cnpj    VARCHAR(50) UNIQUE,
    endereco    VARCHAR(200)
);

CREATE TABLE tipo_parte (
    id_tipo_parte   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_tipo       VARCHAR(50) NOT NULL UNIQUE
);

-- [CORREÇÃO] No script original, id_processo e id_parte tinham "PRIMARY KEY"
-- na definição de coluna E uma constraint composta pk_processo_partes
-- separada. Isso é DDL inválido no PostgreSQL (múltiplas primary keys não
-- são permitidas) e a tabela não seria criada. Aqui existe apenas a
-- constraint composta. Ver database/README.md, item 1.
CREATE TABLE processo_partes (
    id_processo     INTEGER NOT NULL,
    id_parte        INTEGER NOT NULL,
    id_tipo_parte   INTEGER,
    polo            VARCHAR(10) NOT NULL
                    CHECK (polo IN ('ativo', 'passivo', 'terceiro')),

    CONSTRAINT pk_processo_partes
        PRIMARY KEY (id_processo, id_parte),

    CONSTRAINT fk_processo_partes_processo
        FOREIGN KEY (id_processo)
        REFERENCES processos(id_processo),

    CONSTRAINT fk_processo_partes_parte
        FOREIGN KEY (id_parte)
        REFERENCES partes(id_parte),

    CONSTRAINT fk_processo_partes_tipo
        FOREIGN KEY (id_tipo_parte)
        REFERENCES tipo_parte(id_tipo_parte)
);

-- ==========================
-- 5. Pedidos
-- ==========================

-- [CORREÇÃO] Adicionado UNIQUE em nome_pedido. Ver database/README.md, item 7.
CREATE TABLE pedidos (
    id_pedido   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_pedido VARCHAR(200) NOT NULL UNIQUE
);

-- [CORREÇÃO] Coluna "procedente BOOLEAN" substituída por "resultado" com
-- 3 estados, para suportar pedidos parcialmente procedentes (regra de
-- negócio explícita no fluxo de análise). Ver database/README.md, item 4.
CREATE TABLE processo_pedidos (
    id_processo INTEGER NOT NULL,
    id_pedido   INTEGER NOT NULL,
    valor       NUMERIC(15,2),
    resultado   VARCHAR(25)
                CHECK (resultado IN ('procedente', 'improcedente', 'parcialmente_procedente')),

    CONSTRAINT pk_processo_pedidos
        PRIMARY KEY (id_processo, id_pedido),

    CONSTRAINT fk_processo_pedidos_processo
        FOREIGN KEY (id_processo)
        REFERENCES processos(id_processo),

    CONSTRAINT fk_processo_pedidos_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
);

-- ==========================
-- 6. Status e Análise de Decisão (IA)
-- ==========================

CREATE TABLE tipo_sentenca (
    id_tipo_sentenca   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_sentenca       VARCHAR(80)
);

CREATE TABLE status_analise (
    id_status_analise  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_analise        VARCHAR(80) UNIQUE NOT NULL
);

-- [CORREÇÃO] 'Concluida' -> 'Concluída' (acentuação), consistente com o
-- texto do TCC e com o fluxo descrito. Ver database/README.md, item 8.
INSERT INTO status_analise (tipo_analise)
VALUES ('Pendente'), ('Em Análise'), ('Concluída'), ('Erro');

CREATE TABLE analise_decisao (
    id_analise              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_status_analise       INTEGER NOT NULL DEFAULT 1,
    plataforma_utilizada    VARCHAR(50), -- ex: 'gpt-4o'
    input_tokens            INTEGER,
    output_tokens           INTEGER,
    insights_json           JSONB,       -- resposta estruturada da IA
    data_processamento      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    erro_log                TEXT,

    CONSTRAINT fk_analise_decisao_status
        FOREIGN KEY (id_status_analise)
        REFERENCES status_analise(id_status_analise)
);

-- ==========================
-- 7. Sentença
-- [CORREÇÃO] Tabela renomeada de "setenca" para "sentenca" (erro de
-- digitação presente no SQL original e no diagrama de banco). Ver
-- database/README.md, item 2.
-- ==========================

CREATE TABLE sentenca (
    id_sentenca         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_processo         INTEGER NOT NULL,
    id_juiz             INTEGER NOT NULL,
    data_sentenca       DATE,
    id_tipo_sentenca    INTEGER NOT NULL,
    id_tribunal         INTEGER,
    id_comarca          INTEGER,
    id_vara             INTEGER,
    -- [CORREÇÃO] UNIQUE adicionado para garantir relação 1:1 real com
    -- analise_decisao. Ver database/README.md, item 6.
    id_analise          INTEGER UNIQUE REFERENCES analise_decisao(id_analise),

    CONSTRAINT fk_sentenca_processo
        FOREIGN KEY (id_processo) REFERENCES processos(id_processo),

    CONSTRAINT fk_sentenca_juiz
        FOREIGN KEY (id_juiz) REFERENCES juiz(id_juiz),

    CONSTRAINT fk_sentenca_tipo_sentenca
        FOREIGN KEY (id_tipo_sentenca) REFERENCES tipo_sentenca(id_tipo_sentenca),

    CONSTRAINT fk_sentenca_tribunal
        FOREIGN KEY (id_tribunal) REFERENCES tribunal(id_tribunal),

    CONSTRAINT fk_sentenca_comarca
        FOREIGN KEY (id_comarca) REFERENCES comarca(id_comarca),

    CONSTRAINT fk_sentenca_vara
        FOREIGN KEY (id_vara) REFERENCES vara(id_vara)
);

-- ==========================
-- 8. Acórdão
-- ==========================

CREATE TABLE tipo_acordao (
    id_tipo_acordao INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_acordao     VARCHAR(160)
);

CREATE TABLE acordao (
    id_acordao          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_processo         INTEGER,
    id_relator          INTEGER,
    id_desembargador1   INTEGER,
    id_desembargador2   INTEGER,
    data_acordao        DATE,
    id_tipo_acordao     INTEGER NOT NULL,
    reforma_sentenca    BOOLEAN,
    id_tribunal         INTEGER,
    -- [CORREÇÃO] UNIQUE adicionado (mesmo motivo da sentença). Ver
    -- database/README.md, item 6.
    id_analise           INTEGER UNIQUE REFERENCES analise_decisao(id_analise),

    CONSTRAINT fk_acordao_processo
        FOREIGN KEY (id_processo) REFERENCES processos(id_processo),

    CONSTRAINT fk_acordao_relator
        FOREIGN KEY (id_relator) REFERENCES desembargador(id_desembargador),

    CONSTRAINT fk_acordao_desembargador1
        FOREIGN KEY (id_desembargador1) REFERENCES desembargador(id_desembargador),

    CONSTRAINT fk_acordao_desembargador2
        FOREIGN KEY (id_desembargador2) REFERENCES desembargador(id_desembargador),

    CONSTRAINT fk_acordao_tipo_acordao
        FOREIGN KEY (id_tipo_acordao) REFERENCES tipo_acordao(id_tipo_acordao),

    CONSTRAINT fk_acordao_tribunal
        FOREIGN KEY (id_tribunal) REFERENCES tribunal(id_tribunal)
);

-- ==========================
-- 9. Índices
-- [CORREÇÃO] Nenhum índice existia além das chaves primárias no script
-- original. O PostgreSQL não cria índice automático para FKs (diferente
-- da PK). Como a jurimetria depende de agregações pesadas sobre estas
-- colunas, os índices abaixo foram adicionados. Ver database/README.md,
-- item 5.
-- ==========================

CREATE INDEX idx_comarca_tribunal          ON comarca(id_tribunal);
CREATE INDEX idx_vara_comarca              ON vara(id_comarca);
CREATE INDEX idx_juiz_vara                 ON juiz(id_vara);
CREATE INDEX idx_desembargador_tribunal    ON desembargador(id_tribunal);
CREATE INDEX idx_ministro_tribunal         ON ministro(id_tribunal);

CREATE INDEX idx_processos_tribunal        ON processos(id_tribunal);
CREATE INDEX idx_processos_comarca         ON processos(id_comarca);
CREATE INDEX idx_processos_vara            ON processos(id_vara);
CREATE INDEX idx_processos_juiz            ON processos(id_juiz);
CREATE INDEX idx_processos_desembargador   ON processos(id_desembargador);
CREATE INDEX idx_processos_ministro        ON processos(id_ministro);
CREATE INDEX idx_processos_situacao        ON processos(id_situacao);
CREATE INDEX idx_processos_data_distrib    ON processos(data_distribuicao);

CREATE INDEX idx_processo_partes_parte     ON processo_partes(id_parte);
CREATE INDEX idx_processo_pedidos_pedido   ON processo_pedidos(id_pedido);

CREATE INDEX idx_analise_decisao_status    ON analise_decisao(id_status_analise);
CREATE INDEX idx_analise_decisao_data      ON analise_decisao(data_processamento);

CREATE INDEX idx_sentenca_processo         ON sentenca(id_processo);
CREATE INDEX idx_sentenca_juiz             ON sentenca(id_juiz);
CREATE INDEX idx_sentenca_data             ON sentenca(data_sentenca);

CREATE INDEX idx_acordao_processo          ON acordao(id_processo);
CREATE INDEX idx_acordao_relator           ON acordao(id_relator);
CREATE INDEX idx_acordao_data              ON acordao(data_acordao);
