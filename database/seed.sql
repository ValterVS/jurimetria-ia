-- ============================================================
-- Sistema de Análise de Processos Judiciais e Indicadores de Jurimetria
-- database/seed.sql
--
-- Dados FICTÍCIOS para desenvolvimento local e demonstração (apresentação
-- do TCC). Nomes de partes, CPFs/CNPJs, números de processo e textos são
-- inventados - qualquer semelhança com pessoas ou processos reais é
-- coincidência.
--
-- *** NUNCA execute este arquivo em produção. ***
-- Ele não é chamado automaticamente por nenhum script de deploy (ver
-- docs/DEPLOY.md) - rodar é sempre uma ação manual e deliberada.
--
-- Pré-requisito: database/schema.sql já aplicado em um banco vazio
-- (situacao_processo e status_analise já vêm populados pelo schema).
--
-- Uso:
--   psql "$DATABASE_URL" -f database/schema.sql
--   psql "$DATABASE_URL" -f database/seed.sql
-- ============================================================

-- ==========================
-- Catálogos institucionais
-- ==========================

INSERT INTO tribunal (nome_tribunal) VALUES
    ('Tribunal de Justiça de São Paulo'),
    ('Tribunal Regional do Trabalho da 15ª Região'),
    ('Superior Tribunal de Justiça');

INSERT INTO comarca (nome_comarca, id_tribunal) VALUES
    ('Lins', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo')),
    ('Bauru', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo')),
    ('Campinas', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal Regional do Trabalho da 15ª Região'));

INSERT INTO vara (nome_vara, id_comarca) VALUES
    ('1ª Vara Cível de Lins', (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Lins')),
    ('2ª Vara Cível de Lins', (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Lins')),
    ('1ª Vara Cível de Bauru', (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Bauru')),
    ('3ª Vara do Trabalho de Campinas', (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Campinas'));

INSERT INTO juiz (nome_juiz, id_vara) VALUES
    ('Ana Paula Ferreira', (SELECT id_vara FROM vara WHERE nome_vara = '1ª Vara Cível de Lins')),
    ('Marcos Antônio Souza', (SELECT id_vara FROM vara WHERE nome_vara = '2ª Vara Cível de Lins')),
    ('Ricardo Nogueira', (SELECT id_vara FROM vara WHERE nome_vara = '1ª Vara Cível de Bauru')),
    ('Camila Rodrigues', (SELECT id_vara FROM vara WHERE nome_vara = '3ª Vara do Trabalho de Campinas'));

INSERT INTO desembargador (nome_desembargador, id_tribunal) VALUES
    ('Paulo Henrique Lima', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo')),
    ('Fernanda Castro', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo')),
    ('Roberto Almeida', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal Regional do Trabalho da 15ª Região'));

INSERT INTO ministro (nome_ministro, id_tribunal) VALUES
    ('Helena Marques', (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Superior Tribunal de Justiça'));

INSERT INTO tipo_parte (nome_tipo) VALUES
    ('Autor'), ('Réu'), ('Terceiro Interessado');

INSERT INTO pedidos (nome_pedido) VALUES
    ('Horas extras'),
    ('Danos morais'),
    ('Adicional de insalubridade'),
    ('Reintegração ao emprego'),
    ('Indenização por dano material');

INSERT INTO tipo_sentenca (tipo_sentenca) VALUES
    ('Sentença de mérito'),
    ('Sentença de improcedência liminar'),
    ('Sentença homologatória de acordo');

INSERT INTO tipo_acordao (tipo_acordao) VALUES
    ('Acórdão de apelação'),
    ('Acórdão de recurso ordinário');

-- ==========================
-- Partes (nomes e documentos fictícios)
-- ==========================

INSERT INTO partes (nome_parte, cpf_cnpj, endereco) VALUES
    ('João da Silva Santos', '000.000.001-00', 'Rua Fictícia, 100 - Lins/SP'),
    ('Empresa Exemplo Comércio Ltda.', '00.000.001/0001-00', 'Avenida Exemplo, 500 - Bauru/SP'),
    ('Maria Oliveira Costa', '000.000.002-00', 'Rua Modelo, 200 - Campinas/SP'),
    ('Indústria Fictícia S.A.', '00.000.002/0001-00', 'Rodovia Exemplo, km 10 - Campinas/SP');

-- ==========================
-- Processos
-- ==========================

INSERT INTO processos (numero_processo, categoria, id_tribunal, id_comarca, id_vara, data_distribuicao, valor_causa, id_situacao, id_juiz) VALUES
    (
        '1000001-11.2024.8.26.0320', 'Cível',
        (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo'),
        (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Lins'),
        (SELECT id_vara FROM vara WHERE nome_vara = '1ª Vara Cível de Lins'),
        '2024-02-10', 25000.00,
        (SELECT id_situacao FROM situacao_processo WHERE nome_situacao = 'Encerrado'),
        (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Ana Paula Ferreira')
    ),
    (
        '1000002-22.2024.8.26.0320', 'Cível',
        (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo'),
        (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Lins'),
        (SELECT id_vara FROM vara WHERE nome_vara = '2ª Vara Cível de Lins'),
        '2024-05-22', 8500.00,
        (SELECT id_situacao FROM situacao_processo WHERE nome_situacao = 'Em andamento'),
        (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Marcos Antônio Souza')
    ),
    (
        '1000003-33.2023.5.15.0025', 'Trabalhista',
        (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal Regional do Trabalho da 15ª Região'),
        (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Campinas'),
        (SELECT id_vara FROM vara WHERE nome_vara = '3ª Vara do Trabalho de Campinas'),
        '2023-09-05', 42000.00,
        (SELECT id_situacao FROM situacao_processo WHERE nome_situacao = 'Encerrado'),
        (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Camila Rodrigues')
    ),
    (
        '1000004-44.2024.8.26.0071', 'Cível',
        (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo'),
        (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Bauru'),
        (SELECT id_vara FROM vara WHERE nome_vara = '1ª Vara Cível de Bauru'),
        '2024-08-14', 15000.00,
        (SELECT id_situacao FROM situacao_processo WHERE nome_situacao = 'Suspenso'),
        (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Ricardo Nogueira')
    );

-- ==========================
-- Partes vinculadas aos processos
-- ==========================

INSERT INTO processo_partes (id_processo, id_parte, id_tipo_parte, polo) VALUES
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000001-11.2024.8.26.0320'),
        (SELECT id_parte FROM partes WHERE nome_parte = 'João da Silva Santos'),
        (SELECT id_tipo_parte FROM tipo_parte WHERE nome_tipo = 'Autor'), 'ativo'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000001-11.2024.8.26.0320'),
        (SELECT id_parte FROM partes WHERE nome_parte = 'Empresa Exemplo Comércio Ltda.'),
        (SELECT id_tipo_parte FROM tipo_parte WHERE nome_tipo = 'Réu'), 'passivo'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
        (SELECT id_parte FROM partes WHERE nome_parte = 'Maria Oliveira Costa'),
        (SELECT id_tipo_parte FROM tipo_parte WHERE nome_tipo = 'Autor'), 'ativo'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
        (SELECT id_parte FROM partes WHERE nome_parte = 'Indústria Fictícia S.A.'),
        (SELECT id_tipo_parte FROM tipo_parte WHERE nome_tipo = 'Réu'), 'passivo'
    );

-- ==========================
-- Pedidos vinculados aos processos
-- (alguns já com resultado, simulando análises já concluídas)
-- ==========================

INSERT INTO processo_pedidos (id_processo, id_pedido, valor, resultado) VALUES
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000001-11.2024.8.26.0320'),
        (SELECT id_pedido FROM pedidos WHERE nome_pedido = 'Danos morais'), 10000.00, 'procedente'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000002-22.2024.8.26.0320'),
        (SELECT id_pedido FROM pedidos WHERE nome_pedido = 'Indenização por dano material'), 8500.00, NULL
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
        (SELECT id_pedido FROM pedidos WHERE nome_pedido = 'Horas extras'), 18000.00, 'procedente'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
        (SELECT id_pedido FROM pedidos WHERE nome_pedido = 'Adicional de insalubridade'), 6000.00, 'parcialmente_procedente'
    ),
    (
        (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
        (SELECT id_pedido FROM pedidos WHERE nome_pedido = 'Reintegração ao emprego'), NULL, 'improcedente'
    );

-- ==========================
-- Análise de decisão (IA) já concluída - dado de exemplo para a Tela de
-- Análise e para os gráficos de Dashboard/Jurimetria funcionarem sem
-- precisar rodar uma análise de verdade contra a Anthropic.
-- ==========================

INSERT INTO analise_decisao (id_status_analise, plataforma_utilizada, input_tokens, output_tokens, insights_json, erro_log)
VALUES (
    (SELECT id_status_analise FROM status_analise WHERE tipo_analise = 'Concluída'),
    'gpt-5.6-terra', 1840, 620,
    '{
        "tipo_documento": "sentenca",
        "resumo": "Ação de indenização por danos morais julgada procedente. O juízo entendeu comprovada a falha na prestação de serviço pela ré, fixando a indenização em valor inferior ao pleiteado.",
        "processo": {
            "numero_processo": "1000001-11.2024.8.26.0320",
            "tribunal": "Tribunal de Justiça de São Paulo",
            "comarca": "Lins",
            "vara": "1ª Vara Cível de Lins"
        },
        "julgador": { "nome": "Ana Paula Ferreira", "tipo": "juiz" },
        "data_decisao": "2024-11-20",
        "resultado_geral": "procedente",
        "pedidos": [
            {
                "nome": "Danos morais",
                "resultado": "procedente",
                "valor_identificado": 10000.00,
                "fundamentacao_resumida": "Comprovada falha na prestação de serviço e nexo causal com o abalo moral alegado.",
                "trecho_relevante": "Ante o exposto, JULGO PROCEDENTE o pedido para condenar a ré ao pagamento de indenização por danos morais."
            }
        ],
        "pontos_favoraveis": [
            "Nexo causal comprovado por documentação juntada aos autos.",
            "Ausência de impugnação específica pela parte ré quanto aos fatos narrados."
        ],
        "pontos_desfavoraveis": [
            "Valor fixado abaixo do pleiteado na inicial."
        ],
        "valores_identificados": { "valor_condenacao": 10000.00, "custas": 450.00, "honorarios": 1000.00 },
        "acordao": { "reforma_sentenca": null },
        "observacoes": [
            "Sentença sujeita a recurso de apelação no prazo legal."
        ],
        "necessita_revisao_humana": false
    }'::jsonb,
    NULL
);

-- Vincula a sentença de exemplo à análise já concluída acima.
INSERT INTO sentenca (id_processo, id_juiz, data_sentenca, id_tipo_sentenca, id_tribunal, id_comarca, id_vara, id_analise)
VALUES (
    (SELECT id_processo FROM processos WHERE numero_processo = '1000001-11.2024.8.26.0320'),
    (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Ana Paula Ferreira'),
    '2024-11-20',
    (SELECT id_tipo_sentenca FROM tipo_sentenca WHERE tipo_sentenca = 'Sentença de mérito'),
    (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal de Justiça de São Paulo'),
    (SELECT id_comarca FROM comarca WHERE nome_comarca = 'Lins'),
    (SELECT id_vara FROM vara WHERE nome_vara = '1ª Vara Cível de Lins'),
    (SELECT id_analise FROM analise_decisao WHERE plataforma_utilizada = 'gpt-5.6-terra')
);

-- Sentença sem análise ainda (demonstra o estado "Não enviada" na aba
-- Decisões da tela de processo).
INSERT INTO sentenca (id_processo, id_juiz, data_sentenca, id_tipo_sentenca)
VALUES (
    (SELECT id_processo FROM processos WHERE numero_processo = '1000002-22.2024.8.26.0320'),
    (SELECT id_juiz FROM juiz WHERE nome_juiz = 'Marcos Antônio Souza'),
    NULL,
    (SELECT id_tipo_sentenca FROM tipo_sentenca WHERE tipo_sentenca = 'Sentença de mérito')
);

-- ==========================
-- Análise pendente - demonstra o estado "Pendente" (fila de processamento)
-- na Tela de Análise, sem precisar de uma chamada real à Anthropic em
-- andamento.
-- ==========================

INSERT INTO analise_decisao (id_status_analise)
VALUES ((SELECT id_status_analise FROM status_analise WHERE tipo_analise = 'Pendente'));

INSERT INTO acordao (id_processo, id_relator, id_desembargador1, data_acordao, id_tipo_acordao, reforma_sentenca, id_tribunal, id_analise)
VALUES (
    (SELECT id_processo FROM processos WHERE numero_processo = '1000003-33.2023.5.15.0025'),
    (SELECT id_desembargador FROM desembargador WHERE nome_desembargador = 'Roberto Almeida'),
    NULL,
    NULL,
    (SELECT id_tipo_acordao FROM tipo_acordao WHERE tipo_acordao = 'Acórdão de recurso ordinário'),
    NULL,
    (SELECT id_tribunal FROM tribunal WHERE nome_tribunal = 'Tribunal Regional do Trabalho da 15ª Região'),
    (SELECT id_analise FROM analise_decisao WHERE id_status_analise = (SELECT id_status_analise FROM status_analise WHERE tipo_analise = 'Pendente'))
);
