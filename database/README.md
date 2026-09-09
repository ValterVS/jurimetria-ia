# Banco de Dados — Correções em relação ao script original

Este documento explica, item a item, as diferenças entre o script SQL
original fornecido pelos autores (`Banco_Dados_V2.sql`) e o
`database/schema.sql` desta pasta. Nenhuma regra de negócio foi alterada
silenciosamente: toda mudança abaixo foi validada com os autores do
projeto antes de ser aplicada.

## Correções técnicas (SQL original tinha erro real)

### 1. Chave primária duplicada em `processo_partes`

**Original:** as colunas `id_processo` e `id_parte` estavam marcadas como
`PRIMARY KEY` individualmente na definição de coluna, e existia também uma
`CONSTRAINT pk_processo_partes PRIMARY KEY (id_processo, id_parte)` separada.

**Problema:** o PostgreSQL não permite múltiplas primary keys na mesma
tabela. Esse `CREATE TABLE` falha com o erro
`multiple primary keys for table "processo_partes" are not allowed`.

**Correção:** removidos os `PRIMARY KEY` de coluna; mantida apenas a
constraint composta `pk_processo_partes`.

### 2. Nome de tabela com erro de digitação

**Original:** a tabela de sentenças estava nomeada `setenca` (tanto no SQL
quanto no diagrama de banco de dados fornecido). O diagrama de classes UML
também traz a classe como `Senteca`. Em todo o texto do TCC, porém, o termo
usado é sempre "sentença".

**Correção:** tabela renomeada para `sentenca` (nomes de constraints
ajustados de `fk_sentenca_*` — já usavam a grafia correta no meio do nome,
mesmo com a tabela grafada errada).

### 3. Ausência da tabela de situação do processo

**Original:** `processos.id_situacao` é `INTEGER NOT NULL`, mas não existe
nenhuma tabela `situacao` no SQL, nos três diagramas de entidade-relacionamento
ou no diagrama de classes. É uma coluna que sugere uma FK mas não referencia
nada.

**Correção:** criada a tabela `situacao_processo` (`id_situacao`,
`nome_situacao`) com FK a partir de `processos.id_situacao`. Populada com um
conjunto inicial de valores (`Em andamento`, `Suspenso`, `Arquivado`,
`Encerrado`) definido como decisão técnica, já que nenhum documento original
especifica os valores esperados — pode ser ajustado livremente antes da
demonstração final.

### 4. `processo_pedidos.procedente` não suporta resultado parcial

**Original:** coluna `procedente BOOLEAN` (verdadeiro/falso).

**Problema:** o fluxo de negócio documentado exige identificar pedidos
"parcialmente procedentes" além de procedentes/improcedentes — uma coluna
booleana não tem como representar esse terceiro estado.

**Correção:** coluna substituída por `resultado VARCHAR(25)` com
`CHECK (resultado IN ('procedente', 'improcedente', 'parcialmente_procedente'))`,
permanecendo `NULL` até que a análise de IA seja concluída (mesmo
comportamento do booleano original, que também não tinha `NOT NULL`).

### 5. Ausência de índices

**Original:** nenhum índice além dos criados implicitamente pelas chaves
primárias.

**Problema:** diferente da PK, o PostgreSQL não cria índice automático para
colunas de chave estrangeira. Como a jurimetria depende de agregações
(`GROUP BY`/`COUNT`/`AVG`) sobre tribunal, comarca, vara, juiz,
desembargador, pedido, status de análise e datas, a ausência de índices
geraria varreduras completas de tabela (`seq scan`) à medida que o volume de
dados crescesse.

**Correção:** adicionados índices em todas as colunas de FK relevantes para
consultas de jurimetria e nas colunas de data (`data_distribuicao`,
`data_processamento`, `data_sentenca`, `data_acordao`).

### 6. Relação 1:1 entre decisão e análise não era garantida

**Original:** `sentenca.id_analise` e `acordao.id_analise` eram FKs simples
para `analise_decisao`, sem `UNIQUE`.

**Problema:** nada impedia que duas sentenças diferentes apontassem para a
mesma `analise_decisao`, o que quebra a relação 1:1 pretendida pelo desenho
original (cada decisão gera exatamente uma análise).

**Correção:** adicionado `UNIQUE` em `sentenca.id_analise` e
`acordao.id_analise`.

### 7. Catálogo de pedidos sem unicidade

**Original:** `pedidos.nome_pedido VARCHAR(200)`, sem `UNIQUE`.

**Problema:** diferente de outras tabelas de catálogo do mesmo projeto
(`tribunal`, `status_analise`), nada impedia cadastrar "Horas extras" duas
vezes como pedidos distintos, o que fragmentaria as estatísticas de
jurimetria por pedido (cada duplicata seria contada separadamente).

**Correção:** adicionado `UNIQUE` em `pedidos.nome_pedido`.

### 8. Divergência de acentuação no seed de status

**Original:** `INSERT INTO status_analise ... VALUES (..., 'Concluida', ...)`
(sem acento).

**Problema:** o texto do TCC e o fluxo de negócio documentado usam sempre
"Concluída" (com acento) para esse status.

**Correção:** seed ajustado para `'Concluída'`.

## Decisões de escopo (não são correções de erro no SQL)

### Entidade `Usuario` do diagrama de classes não foi implementada

O diagrama de classes UML do TCC modela uma entidade `Usuario`
(`nome_usuario`, `senha`), associada a "Cadastra Processo". Essa entidade
**não existe** no script SQL original nem nos diagramas de entidade-relacionamento.
O fluxo funcional descrito para a versão final do sistema trata login como
"caso futuramente implementado", e a lista de telas obrigatórias do MVP não
inclui tela de login.

Decisão (validada com os autores): o MVP não implementa autenticação. A
tabela `Usuario` do UML fica registrada aqui como trabalho futuro, para não
ser perdida, mas propositalmente fora do `schema.sql` atual.

## O que NÃO foi alterado

Todas as demais tabelas, colunas, tipos de dado, relacionamentos e nomes
foram mantidos exatamente como no script original: `tribunal`, `comarca`,
`vara`, `juiz`, `desembargador`, `ministro`, `processos` (exceto a FK nova de
situação), `partes`, `tipo_parte`, `pedidos` (exceto o `UNIQUE`),
`tipo_sentenca`, `status_analise`, `analise_decisao`, `tipo_acordao` e
`acordao`. O banco continua centrado em `analise_decisao.insights_json`
(`JSONB`) como local de armazenamento da resposta estruturada da IA.

## Como executar

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

O script é idempotente apenas na primeira execução (não usa
`IF NOT EXISTS`/`DROP`); para recriar do zero, aponte para um banco vazio.
Dados fictícios de demonstração ficam em `database/seed.sql` (Fase 3+), nunca
neste arquivo.
