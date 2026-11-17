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
-- 0. Empresas (contas de acesso ao sistema)
-- Cada empresa cadastrada só enxerga os processos que ela mesma criou
-- (ver id_empresa na tabela processos, seção 3). Catálogos institucionais
-- (tribunal, comarca, vara, juiz, desembargador, ministro, tipos, pedidos)
-- são dados de referência compartilhados entre todas as empresas.
-- ==========================

CREATE TABLE empresa (
    id_empresa          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cnpj                VARCHAR(18) NOT NULL UNIQUE,
    nome_empresa        VARCHAR(200) NOT NULL,
    -- pessoa física responsável pelo cadastro (para vincular empresa <-> usuário
    -- que fez o cadastro, já que hoje só existe uma conta por empresa)
    nome_responsavel    VARCHAR(200) NOT NULL,
    cpf_responsavel     VARCHAR(14) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    senha_hash          VARCHAR(255) NOT NULL,
    email_verificado    BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Código de verificação de e-mail (2FA no cadastro), enviado por e-mail e
-- guardado apenas com hash (sha256) - o código em texto puro nunca é
-- persistido, só trafega no e-mail enviado à empresa.
CREATE TABLE verificacao_email (
    id_verificacao      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_empresa          INTEGER NOT NULL REFERENCES empresa(id_empresa) ON DELETE CASCADE,
    codigo_hash         VARCHAR(64) NOT NULL,
    expira_em           TIMESTAMP NOT NULL,
    usado               BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verificacao_email_empresa ON verificacao_email(id_empresa);

-- Token de redefinição de senha (esqueci minha senha), mesma lógica de
-- hash do código de verificação acima.
CREATE TABLE redefinicao_senha (
    id_redefinicao      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_empresa          INTEGER NOT NULL REFERENCES empresa(id_empresa) ON DELETE CASCADE,
    token_hash          VARCHAR(64) NOT NULL UNIQUE,
    expira_em           TIMESTAMP NOT NULL,
    usado               BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_redefinicao_senha_empresa ON redefinicao_senha(id_empresa);

-- ==========================
-- 1. Catálogos institucionais
-- ==========================

CREATE TABLE tribunal (
    id_tribunal     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_tribunal   VARCHAR(100) NOT NULL UNIQUE
);

-- Tribunais padrão do Judiciário brasileiro, para o usuário só selecionar
-- (comarcas e varas são cadastradas na hora, pelo formulário do processo).
-- A mesma lista está em database/tribunais_padrao.sql (idempotente), para
-- completar bancos criados antes dela existir.
INSERT INTO tribunal (nome_tribunal) VALUES
    ('Supremo Tribunal Federal'),
    ('Superior Tribunal de Justiça'),
    ('Tribunal Superior do Trabalho'),
    ('Tribunal Superior Eleitoral'),
    ('Superior Tribunal Militar'),
    ('Tribunal Regional Federal da 1ª Região'),
    ('Tribunal Regional Federal da 2ª Região'),
    ('Tribunal Regional Federal da 3ª Região'),
    ('Tribunal Regional Federal da 4ª Região'),
    ('Tribunal Regional Federal da 5ª Região'),
    ('Tribunal Regional Federal da 6ª Região'),
    ('Tribunal Regional do Trabalho da 1ª Região'),
    ('Tribunal Regional do Trabalho da 2ª Região'),
    ('Tribunal Regional do Trabalho da 3ª Região'),
    ('Tribunal Regional do Trabalho da 4ª Região'),
    ('Tribunal Regional do Trabalho da 5ª Região'),
    ('Tribunal Regional do Trabalho da 6ª Região'),
    ('Tribunal Regional do Trabalho da 7ª Região'),
    ('Tribunal Regional do Trabalho da 8ª Região'),
    ('Tribunal Regional do Trabalho da 9ª Região'),
    ('Tribunal Regional do Trabalho da 10ª Região'),
    ('Tribunal Regional do Trabalho da 11ª Região'),
    ('Tribunal Regional do Trabalho da 12ª Região'),
    ('Tribunal Regional do Trabalho da 13ª Região'),
    ('Tribunal Regional do Trabalho da 14ª Região'),
    ('Tribunal Regional do Trabalho da 15ª Região'),
    ('Tribunal Regional do Trabalho da 16ª Região'),
    ('Tribunal Regional do Trabalho da 17ª Região'),
    ('Tribunal Regional do Trabalho da 18ª Região'),
    ('Tribunal Regional do Trabalho da 19ª Região'),
    ('Tribunal Regional do Trabalho da 20ª Região'),
    ('Tribunal Regional do Trabalho da 21ª Região'),
    ('Tribunal Regional do Trabalho da 22ª Região'),
    ('Tribunal Regional do Trabalho da 23ª Região'),
    ('Tribunal Regional do Trabalho da 24ª Região'),
    ('Tribunal de Justiça do Acre'),
    ('Tribunal de Justiça de Alagoas'),
    ('Tribunal de Justiça do Amapá'),
    ('Tribunal de Justiça do Amazonas'),
    ('Tribunal de Justiça da Bahia'),
    ('Tribunal de Justiça do Ceará'),
    ('Tribunal de Justiça do Distrito Federal e dos Territórios'),
    ('Tribunal de Justiça do Espírito Santo'),
    ('Tribunal de Justiça de Goiás'),
    ('Tribunal de Justiça do Maranhão'),
    ('Tribunal de Justiça de Mato Grosso'),
    ('Tribunal de Justiça de Mato Grosso do Sul'),
    ('Tribunal de Justiça de Minas Gerais'),
    ('Tribunal de Justiça do Pará'),
    ('Tribunal de Justiça da Paraíba'),
    ('Tribunal de Justiça do Paraná'),
    ('Tribunal de Justiça de Pernambuco'),
    ('Tribunal de Justiça do Piauí'),
    ('Tribunal de Justiça do Rio de Janeiro'),
    ('Tribunal de Justiça do Rio Grande do Norte'),
    ('Tribunal de Justiça do Rio Grande do Sul'),
    ('Tribunal de Justiça de Rondônia'),
    ('Tribunal de Justiça de Roraima'),
    ('Tribunal de Justiça de Santa Catarina'),
    ('Tribunal de Justiça de São Paulo'),
    ('Tribunal de Justiça de Sergipe'),
    ('Tribunal de Justiça do Tocantins');

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
    id_empresa          INTEGER NOT NULL REFERENCES empresa(id_empresa),
    numero_processo     VARCHAR(48) NOT NULL,
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
        FOREIGN KEY (id_ministro) REFERENCES ministro(id_ministro),

    -- número de processo é único POR EMPRESA, não globalmente: duas
    -- empresas diferentes (ex: escritórios de partes opostas) podem
    -- acompanhar o mesmo processo real (mesmo número CNJ) de forma
    -- independente no sistema.
    CONSTRAINT uq_processos_empresa_numero UNIQUE (id_empresa, numero_processo)
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
--
-- Um mesmo pedido do catálogo pode aparecer mais de uma vez no processo quando
-- há fundamentos distintos (ex: "Danos morais" por rescisão e "Danos morais"
-- por dano existencial): a "descricao" diferencia os registros.
--
-- Guarda o resultado das duas instâncias, para os painéis de jurimetria:
--   1º grau: resultado_sentenca + id_juiz (juiz que proferiu a sentença)
--   2º grau: resultado_acordao  + id_desembargador (relator do acórdão)
--   resultado = situação ATUAL do pedido (o acórdão substitui o da sentença);
--   reformado = o acórdão mudou o resultado dado pela sentença.
-- Preenchidos pela análise de IA (resultado NULL com juiz = "sem resultado").
CREATE TABLE processo_pedidos (
    id_processo_pedido INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_processo INTEGER NOT NULL,
    id_pedido   INTEGER NOT NULL,
    descricao   VARCHAR(300),
    valor       NUMERIC(15,2),
    resultado   VARCHAR(25)
                CHECK (resultado IN ('procedente', 'improcedente', 'parcialmente_procedente')),
    id_juiz     INTEGER,
    resultado_sentenca VARCHAR(25)
                CHECK (resultado_sentenca IN ('procedente', 'improcedente', 'parcialmente_procedente')),
    id_desembargador INTEGER,
    resultado_acordao VARCHAR(25)
                CHECK (resultado_acordao IN ('procedente', 'improcedente', 'parcialmente_procedente')),
    reformado   BOOLEAN,
    -- por que cada instância decidiu assim (resumo extraído pela IA); alimenta
    -- a seção "por que decidiu assim" da jurimetria
    fundamentacao_sentenca TEXT,
    fundamentacao_acordao  TEXT,

    CONSTRAINT fk_processo_pedidos_juiz
        FOREIGN KEY (id_juiz)
        REFERENCES juiz(id_juiz),

    CONSTRAINT fk_processo_pedidos_desembargador
        FOREIGN KEY (id_desembargador)
        REFERENCES desembargador(id_desembargador),

    CONSTRAINT fk_processo_pedidos_processo
        FOREIGN KEY (id_processo)
        REFERENCES processos(id_processo),

    CONSTRAINT fk_processo_pedidos_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
);

-- não permite o mesmo pedido com a mesma descrição duas vezes no processo
CREATE UNIQUE INDEX uq_processo_pedidos_descricao
    ON processo_pedidos (id_processo, id_pedido, lower(COALESCE(descricao, '')));

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
    id_tipo_acordao     INTEGER,  -- opcional: a IA preenche na análise
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

CREATE INDEX idx_processos_empresa         ON processos(id_empresa);

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
CREATE INDEX idx_processo_pedidos_juiz     ON processo_pedidos(id_juiz);
CREATE INDEX idx_processo_pedidos_desemb   ON processo_pedidos(id_desembargador);
CREATE INDEX idx_analise_decisao_status    ON analise_decisao(id_status_analise);
CREATE INDEX idx_analise_decisao_data      ON analise_decisao(data_processamento);

CREATE INDEX idx_sentenca_processo         ON sentenca(id_processo);
CREATE INDEX idx_sentenca_juiz             ON sentenca(id_juiz);
CREATE INDEX idx_sentenca_data             ON sentenca(data_sentenca);

CREATE INDEX idx_acordao_processo          ON acordao(id_processo);
CREATE INDEX idx_acordao_relator           ON acordao(id_relator);
CREATE INDEX idx_acordao_data              ON acordao(data_acordao);
