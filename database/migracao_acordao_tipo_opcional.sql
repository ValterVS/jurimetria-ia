-- Torna o tipo de acórdão opcional (a análise por IA passa a preenchê-lo).
-- Idempotente: pode ser executado mais de uma vez.
ALTER TABLE acordao ALTER COLUMN id_tipo_acordao DROP NOT NULL;
