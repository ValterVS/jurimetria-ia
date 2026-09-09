# Testes do backend

Usa o test runner nativo do Node (`node:test` + `node:assert/strict`) — **nenhuma dependência nova foi adicionada** só para testar.

## Rodando

```bash
cd backend
npm test
```

Equivale a `node --test`, que descobre automaticamente todos os arquivos `**/*.test.js` em `tests/`.

## O que é (e não é) testado aqui

Nenhum teste desta suíte toca um Postgres real nem a API da Anthropic real:

- **Banco de dados**: os testes que dependem de `pool.query` substituem `src/config/db.js` por um objeto fake injetado diretamente no cache de módulos do Node (`tests/helpers/mockRequire.js`), antes do módulo real (repository, `app.js`) ser exigido. Isso permite testar a *forma* do SQL gerado (filtros parametrizados, JOINs condicionais) e o comportamento de repositórios/controllers sem infraestrutura externa.
- **Anthropic**: `decisionAnalysisService` é testado com `aiProvider.js` inteiramente mockado — a função `analyzeDecision` é uma fake controlada pelo teste, nunca uma chamada de rede real. Isso é intencional e não deve mudar: rodar os testes nunca deve consumir crédito da Anthropic.

## Estrutura

- `tests/helpers/mockRequire.js` — utilitário para substituir um módulo no `require.cache` antes de outro módulo dependente dele ser carregado.
- `tests/helpers/fixtures.js` — payload de exemplo válido para `decisionAnalysisSchema`, reaproveitado entre testes do schema e do orquestrador.
- `tests/unit/` — funções puras ou com uma única dependência fácil de isolar:
  - `anonymization.service.test.js` — mascaramento de CPF/CNPJ/e-mail/telefone/RG/dados bancários/endereço, e preservação de nomes de tribunal/comarca/vara/juiz.
  - `decisionAnalysisSchema.test.js` — validação Zod da resposta estruturada da IA (aceita/rejeita payloads).
  - `jurimetria.service.test.js` — cálculo de percentuais e normalização de status de análise.
  - `jurimetriaRepository.test.js` — forma do SQL gerado pelas queries de jurimetria (WHERE parametrizado, JOIN condicional por pedido).
- `tests/integration/` — múltiplos módulos reais trabalhando juntos, só a borda externa (banco/IA) é fake:
  - `decisionAnalysisService.test.js` — fluxo completo Pendente → Concluída/Erro, casamento de pedidos por nome, regra de nunca sobrescrever `reforma_sentenca` definida manualmente, guarda-corpos de `startAnalysis` (409/404/400).
  - `api.endpoints.test.js` — sobe o `app.js` real num servidor HTTP efêmero e faz requisições de verdade (`GET /api/health`, CRUD de um cadastro auxiliar, 404/paginação de processos).

## Adicionando um teste novo

Siga o padrão de `mockModule`/`clearCache` já usado nos arquivos de `tests/integration/` sempre que o módulo testado importar um repository ou `config/db.js` - isso evita qualquer tentativa de conexão real durante os testes.
