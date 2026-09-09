# CLAUDE.md — Guia para continuar este projeto

> Este arquivo existe para que outra instância do Claude (ou você, no futuro) consiga
> retomar o trabalho neste repositório sem precisar re-explorar tudo do zero.
> Última atualização: 2026-09-09.

## O que é este projeto

TCC (Trabalho de Conclusão de Curso) de Engenharia de Software — UNILINS, 2026.
Autores: Valter Silva e Marcelo Cruz Caceraghi.

**Sistema de Jurimetria**: cadastro de processos judiciais, partes e pedidos; anexação
de sentenças/acórdãos; envio do texto dessas decisões para análise automática por IA
(Anthropic Claude); painel de jurimetria com estatísticas históricas (nunca previsões)
de resultados por tribunal, comarca, vara, juiz/desembargador e tipo de pedido.

Princípio central mantido em toda a implementação: **a IA nunca calcula estatística**.
Ela só faz leitura semântica de um documento por vez; toda agregação (percentuais,
contagens, médias) é calculada pelo PostgreSQL/backend a partir de resultados já
persistidos.

## Stack e arquitetura

```
Frontend (React 18 + Vite + Tailwind)  --HTTP-->  Backend (Node.js + Express)  --SQL-->  PostgreSQL
                                                          |
                                                          +--HTTPS-->  Anthropic API (Messages API)
```

- Frontend nunca fala diretamente com PostgreSQL nem com a Anthropic — tudo passa pelo backend.
- `ANTHROPIC_API_KEY` só existe no ambiente do backend, nunca chega ao navegador.
- Backend em camadas: `routes` → `controllers` → `services` → `repositories` → `validators`,
  mais uma camada `ai/` isolada que abstrai o provedor de IA (`AIProvider` → hoje só
  `AnthropicProvider`).
- Testes: `node:test` nativo (`npm test` no backend). 64 testes, todos passando.

### Por que a camada `AIProvider` existe

Foi decisão de design deliberada (não acidental) desacoplar o resto do backend do
provedor de IA específico. Isso **provou seu valor nesta sessão**: quando o projeto foi
migrado de OpenAI para Anthropic Claude, a mudança ficou 100% contida em
`backend/src/ai/` — nenhum arquivo em `controllers/`, `services/` ou `routes/` precisou
ser tocado.

```
backend/src/ai/
├── aiProvider.js              # getAIProvider() -> retorna o provider ativo
├── anthropicClient.js         # cria/memoiza o client do SDK @anthropic-ai/sdk
├── decisionAnalysisService.js # orquestra: chama o provider, trata erros de alto nível
├── retry.js                   # callWithRetry() com backoff para chamadas à API
├── prompts/decisionAnalysisPrompt.js
├── schemas/decisionAnalysisSchema.js  # schema Zod p/ validação independente no backend
└── providers/
    └── anthropicProvider.js   # única implementação hoje; ponto de troca futuro
```

## Principais arquivos do backend

| Arquivo | O que faz |
|---|---|
| `backend/src/app.js` | monta o Express: helmet, CORS (allowlist via `FRONTEND_URL`), rate limit (300 req/15min), rotas, error handler |
| `backend/src/server.js` | sobe o servidor HTTP |
| `backend/src/config/env.js` | valida env vars na subida (avisa, não derruba o processo) |
| `backend/src/config/db.js` | pool de conexão PostgreSQL (`pg`) |
| `backend/src/routes/index.js` | agrega todas as rotas sob `/api` |
| `backend/src/ai/providers/anthropicProvider.js` | **arquivo mais sensível do projeto** — integração com Claude via Structured Outputs (ver seção dedicada abaixo) |
| `backend/src/services/anonymization.service.js` | mascara CPF, CNPJ, e-mail, telefone, CEP, RG, dados bancários (regex) antes de enviar texto à IA — requisito de LGPD |
| `backend/src/services/documentExtraction.service.js` | extrai texto de PDF (`pdf-parse`) e DOCX (`mammoth`) enviados pelo usuário |
| `backend/src/controllers/catalogController.factory.js` + `repositories/catalogRepository.factory.js` + `services/catalogService.factory.js` | fábrica genérica reaproveitada pelos 9 catálogos auxiliares (tribunal, comarca, vara, juiz, desembargador, ministro, tipo_parte, tipo_sentenca, tipo_acordao, situacao_processo) — evita repetir CRUD idêntico 9 vezes |
| `backend/src/repositories/jurimetria.repository.js` + `services/jurimetria.service.js` + `controllers/jurimetria.controller.js` | consultas agregadas (SQL) que alimentam o painel de jurimetria |
| `database/schema.sql` | schema atual do banco (ver `PROGRESS.md`/PDF de diferenças para o que mudou vs. o script original do TCC) |
| `database/seed.sql` | dados de exemplo para desenvolvimento |

## Principais arquivos do frontend

| Arquivo/pasta | O que faz |
|---|---|
| `frontend/src/pages/Processos/` | CRUD de processos + abas (visão geral, partes, pedidos, decisões) |
| `frontend/src/pages/Decisoes/` | telas de adicionar sentença/acórdão e ver resultado da análise |
| `frontend/src/hooks/useAnalisePolling.js` | faz polling em `GET /api/analises/:id` enquanto status for Pendente/Em Análise |
| `frontend/src/pages/Jurimetria/` | painel de jurimetria (abas por julgador, por pedido, por tribunal) |
| `frontend/src/pages/Cadastros/CadastroGenericoPage.jsx` | tela CRUD genérica reaproveitada pelos 9 catálogos auxiliares |
| `frontend/src/services/*.service.js` | camada de chamadas HTTP (axios) para cada recurso da API |

## A integração com Claude (ponto mais frágil/recém-corrigido do sistema)

`backend/src/ai/providers/anthropicProvider.js` usa **Structured Outputs** da API da
Anthropic (recurso real e atual, não confundir com o `.parse()` conveniente do SDK
Python, que não existe da mesma forma no SDK JS instalado):

```js
client.messages.create({
  model, max_tokens: maxTokens,
  system: DECISION_ANALYSIS_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userContent }],
  output_config: {
    format: { type: 'json_schema', schema: ANALISE_JSON_SCHEMA }, // schema escrito à mão
    effort,
  },
})
```

Pontos importantes para quem for mexer aqui de novo:

1. **O JSON de resposta vem dentro de um content block de texto** (`response.content`
   com um item `{type: 'text', text: '...'}`), não em um campo `parsed_output` — esse
   campo só existe na conveniência `.parse()` do SDK Python, que a versão instalada do
   SDK JS (`@anthropic-ai/sdk@0.65.0`) não replica da mesma forma.
2. **O schema JSON é escrito à mão** (`ANALISE_JSON_SCHEMA`, dentro do próprio arquivo),
   não gerado automaticamente a partir do Zod, porque o helper de conversão do SDK
   exige `zod/v4` e o projeto usa Zod v3 (`decisionAnalysisSchema.js`). O Zod continua
   sendo usado para uma **segunda validação independente no backend**, depois que o
   JSON volta da IA — nunca confiamos apenas na garantia do lado da Anthropic.
3. **`effort` afeta TODOS os tokens da resposta**, inclusive o "pensamento" interno do
   modelo (adaptive thinking), que consome do mesmo orçamento de `max_tokens`. O padrão
   da API para Claude Sonnet 5 é `effort: "high"`; o código usa `medium` por padrão
   (`DEFAULT_EFFORT`) porque é uma tarefa de classificação/extração simples, e a
   documentação da Anthropic recomenda `low`/`medium` para esse tipo de caso.
4. **`DEFAULT_MAX_TOKENS = 8000`** — foi aumentado depois que o usuário bateu no erro
   `stop_reason: 'max_tokens'` com um valor menor. Ambos os defaults (`DEFAULT_MAX_TOKENS`,
   `DEFAULT_EFFORT`) são sobrescrevíveis via env vars (`ANTHROPIC_MAX_TOKENS`,
   `ANTHROPIC_EFFORT`) sem precisar mexer em código — importante porque o usuário está
   controlando um orçamento real de créditos da API (~US$5).
5. Se `response.stop_reason` for `'max_tokens'` ou `'model_context_window_exceeded'`,
   o serviço lança um erro 502 explicando que a resposta ficou incompleta. Se for
   `'refusal'`, lança 422 com o texto da recusa.
6. **Lazy-require**: chamadas `require()` de SDKs ficam dentro das funções que as usam,
   nunca no topo do módulo — convenção do projeto, mantenha ao editar este arquivo.

### Fluxo completo de uma análise (do clique do usuário até o resultado)

1. Usuário envia o texto da decisão (colado ou arquivo PDF/DOCX/TXT).
2. Backend cria o registro de análise com status **Pendente** — antes de qualquer
   chamada externa, para garantir que a decisão nunca fica "sem análise registrada".
3. Resposta HTTP volta na hora (202 Accepted); processamento continua em segundo plano.
4. Status muda para **Em Análise**; se foi arquivo, o texto é extraído.
5. **Anonimização (LGPD)**: CPF, CNPJ, e-mail, telefone, CEP, RG e dados bancários são
   mascarados antes de sair do servidor.
6. Envio à Claude API com Structured Outputs (JSON Schema força o formato de resposta).
7. Validação independente no backend com Zod.
8. Persistência: `insights_json` salvo em `analise_decisao`; pedidos do processo
   atualizados com o resultado identificado (casamento por nome, case-insensitive — a
   IA nunca cria um pedido novo no catálogo automaticamente).
9. Status final **Concluída**; frontend em polling detecta e mostra o resultado.
10. Se qualquer etapa de 4 a 8 falhar, status vira **Erro** com `erro_log` preenchido —
    a sentença/acórdão e a análise nunca são perdidas, e o usuário pode tentar de novo.

## Variáveis de ambiente (`backend/.env`)

Ver `backend/.env.example` para a lista comentada completa. As mais relevantes:

```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/jurimetria
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=          # obrigatória para a análise por IA funcionar
ANTHROPIC_MODEL=claude-sonnet-5
# ANTHROPIC_MAX_TOKENS=8000   (opcional, default já é 8000 no código)
# ANTHROPIC_EFFORT=medium     (opcional, default já é medium no código)
```

**Nota de segurança**: nesta sessão foi encontrada uma chave real da OpenAI em texto
plano em `backend/.env` (não vazada — `.env` está no `.gitignore` — mas exposta em
disco). Foi substituída pelas variáveis da Anthropic. Recomendação já passada ao
usuário: revogar a chave antiga da OpenAI, já que não é mais usada pelo código.

## Bugs conhecidos / limitações atuais

- **Sem autenticação/login.** O sistema não tem tela de login nem controle de acesso,
  apesar de isso ter aparecido no diagrama de classes original do TCC. Qualquer pessoa
  com acesso à URL do frontend consegue usar o sistema. Se for exigido para a defesa,
  é o maior gap funcional pendente.
- **Sem fila de jobs persistente.** O processamento em segundo plano da análise por IA é
  "fire-and-forget" em memória (não usa Redis/BullMQ/etc.). Se o processo do backend
  cair no meio de uma análise, ela fica presa em "Em Análise" (não em "Erro") até ser
  reiniciada/reprocessada manualmente. Aceitável para escopo de TCC, mas é uma limitação
  real de produção.
- **Anonimização é baseada em regex**, não em NER (Named Entity Recognition). Cobre CPF,
  CNPJ, e-mail, telefone, CEP, RG e dados bancários nos formatos comuns, mas pode deixar
  passar nomes próprios de pessoas físicas mencionados em texto livre.
- **Sem suporte a OCR.** PDFs escaneados (imagem, sem camada de texto) não são
  processados — só PDFs com texto real e DOCX.
- **Integração com Claude corrigida mas não testada end-to-end neste ambiente.** O
  sandbox onde as correções foram feitas não tem acesso de rede à API da Anthropic nem
  a registries de pacotes (npm/PyPI retornam 403; chamadas diretas a `api.anthropic.com`
  são bloqueadas pelo proxy do sandbox). Toda verificação foi estática: leitura do
  código-fonte do SDK instalado (`@anthropic-ai/sdk@0.65.0`), `node --check`, e a suíte
  de 64 testes (mockada) passando. **O teste real com uma chave de API válida só pode
  ser feito na máquina do usuário.**

## Próximos passos sugeridos

1. **Prioridade imediata**: usuário deve testar a análise por IA na própria máquina com
   uma chave real da Anthropic configurada (`ANTHROPIC_API_KEY` em `backend/.env`) e
   confirmar que o fluxo completo funciona sem o erro de token/módulo que motivou as
   correções desta sessão.
2. Se a apresentação/banca exigir, avaliar implementar autenticação simples (mesmo que
   básica, ex: um único usuário/senha compartilhado da instituição) antes da defesa.
3. Revogar a chave antiga da OpenAI encontrada em `.env` (não é mais usada).
4. Não há mais nenhuma tarefa de código pendente que o usuário tenha solicitado e não
   recebido — os dois PDFs de apresentação (documentação técnica completa e diferenças
   vs. TCC original) já foram entregues em `C:\Users\valte\Downloads\TCC\`.

## Como retomar (para outra instância do Claude)

1. Leia este arquivo e o `PROGRESS.md` inteiros antes de qualquer coisa.
2. Rode `cd backend && npm test` para confirmar que os 64 testes ainda passam antes de
   mexer em qualquer código.
3. Se for mexer em `anthropicProvider.js`, releia a seção "A integração com Claude"
   acima primeiro — é fácil reintroduzir os mesmos dois bugs já corrigidos (usar
   `zodOutputFormat`/`.parse()` que não existem nesta versão do SDK, ou deixar
   `max_tokens` baixo demais para o `effort` configurado).
4. Este ambiente de execução (sandbox) **não tem acesso à internet** para instalar
   pacotes novos nem para chamar a API real da Anthropic — qualquer verificação viva
   precisa ser pedida ao usuário, que roda na própria máquina.
5. Os dois PDFs de apresentação já entregues (`Sistema_Jurimetria_Documentacao_Tecnica.pdf`
   e `Sistema_Jurimetria_Diferencas_Original_x_Entregue.pdf`) estão em
   `C:\Users\valte\Downloads\TCC\` — são a fonte mais completa de contexto histórico
   sobre decisões de design, caso precise de mais detalhe do que cabe aqui.
