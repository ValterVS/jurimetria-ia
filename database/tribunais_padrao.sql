-- ============================================================
-- Tribunais padrão (lista de referência do Judiciário brasileiro)
--
-- Idempotente: pode ser executado quantas vezes quiser, inclusive em um
-- banco que já está em uso (não duplica nem altera o que já existe).
-- Esta mesma lista já faz parte do database/schema.sql em bancos novos;
-- use este arquivo apenas para completar um banco criado antes disso:
--   psql "$DATABASE_URL" -f database/tribunais_padrao.sql
-- ============================================================

INSERT INTO tribunal (nome_tribunal) VALUES
    -- Tribunais superiores
    ('Supremo Tribunal Federal'),
    ('Superior Tribunal de Justiça'),
    ('Tribunal Superior do Trabalho'),
    ('Tribunal Superior Eleitoral'),
    ('Superior Tribunal Militar'),
    -- Justiça Federal
    ('Tribunal Regional Federal da 1ª Região'),
    ('Tribunal Regional Federal da 2ª Região'),
    ('Tribunal Regional Federal da 3ª Região'),
    ('Tribunal Regional Federal da 4ª Região'),
    ('Tribunal Regional Federal da 5ª Região'),
    ('Tribunal Regional Federal da 6ª Região'),
    -- Justiça do Trabalho
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
    -- Justiça Estadual
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
    ('Tribunal de Justiça do Tocantins')
ON CONFLICT (nome_tribunal) DO NOTHING;
