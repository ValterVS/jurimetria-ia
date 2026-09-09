# Sistema de Jurimetria — Aplicação de Inteligência Artificial na Análise de Processos Judiciais e Indicadores de Jurimetria

Trabalho de Conclusão de Curso — Engenharia de Software, UNILINS (2026).

Autores: Valter Silva e Marcelo Cruz Caceraghi.

## Visão geral

O sistema apoia escritórios e departamentos jurídicos no acompanhamento de processos judiciais, permitindo cadastrar processos, partes e pedidos, anexar sentenças e acórdãos, e enviar o texto dessas decisões para análise automática por Inteligência Artificial. A IA extrai um resumo estruturado da decisão (resultado por pedido, pontos favoráveis/desfavoráveis, valores identificados) que alimenta um painel de **jurimetria**: estatísticas históricas de resultados por tribunal, comarca, vara, juiz/desembargador e tipo de pedido.

Um princípio central do projeto, mantido em toda a implementação: **a IA nunca calcula estatística**. Ela só faz leitura semântica de um documento por vez; toda agregação (percentuais, contagens, médias) é calculada pelo PostgreSQL/backend a partir dos resultados já persistidos. Os números exibidos são sempre estatística histórica descritiva — nunca uma previsão de resultado futuro.

## Arquitetura

```
Frontend (React + Vite)  --HTTP-->  Backend (Node.js + Express)  --SQL-->  PostgreSQL
                                            |
                                            +--HTTPS-->  Anthropic API (Messages API)
```

- O frontend nunca fala diretamente com o PostgreSQL nem com a Anthropic — todo acesso passa pelo backend.
- A chave da Anthropic (`ANTHROPIC_API_KEY`) só existe no ambiente do backend; nunca é enviada ao navegador.
- Backend organizado em camadas: `routes` → `controllers` → `services` → `repositories`, mais uma camada `ai/` isolada (`AIProvider` → `AnthropicProvider`) que abstrai o provedor de IA — hoje só a Anthropic (Claude) está implementada, mas a troca por outro modelo no futuro não deveria exigir tocar em `services`/`controllers`.

### Fluxo de uma análise por IA

1. Usuário cadastra o processo, partes e pedidos.
2. Usuário adiciona uma sentença ou acórdão (metadados: juiz/relator, data, tipo).
3. Usuário envia o texto da decisão (colado ou arquivo PDF/TXT/DOCX) para análise.
4. O backend cria imediatamente um registro de análise com status **Pendente** — antes de qualquer chamada externa. Isso garante que a decisão nunca fica "sem análise registrada", mesmo que a chamada à IA falhe.
5. A resposta HTTP volta na hora (202 Accepted); o processamento continua em segundo plano.
6. Em segundo plano: status vira **Em Análise** → o texto é anonimizado (LGPD) → enviado à Anthropic (Claude) com Structured Outputs (schema fixo, ver abaixo) → a resposta é validada de novo no backend (nunca confiamos apenas na garantia do lado da Anthropic) → status vira **Concluída**, e o `insights_json` é persistido.
7. Se qualquer etapa falhar (rede, timeout, resposta inválida, recusa do modelo), o status vira **Erro** com `erro_log` preenchido — a sentença/acórdão e a análise nunca são perdidas, e o usuário pode tentar novamente.
8. O frontend acompanha o status via *polling* em `GET /api/analises/:id`, com atualização automática da tela enquanto o status for Pendente/Em Análise.
9. Ao concluir, os pedidos identificados pela IA são casados por nome (case-insensitive) com os pedidos já cadastrados no processo e têm seu `resultado` atualizado — a IA nunca cria um pedido novo no catálogo automaticamente, para não fragmentar a jurimetria com variações de texto livre.

### Estrutura da resposta da IA

A IA é obrigada, via Structured Outputs (JSON Schema gerado a partir de um schema Zod), a responder sempre neste formato:

```jsonc
{
  "tipo_documento": "sentenca" | "acordao",
  "resumo": "string",
  "processo": { "numero_processo": "string|null", "tribunal": "string|null", "comarca": "string|null", "vara": "string|null" },
  "julgador": { "nome": "string|null", "tipo": "juiz" | "desembargador" | "ministro" | "nao_identificado" },
  "data_decisao": "AAAA-MM-DD|null",
  "resultado_geral": "procedente" | "improcedente" | "parcialmente_procedente" | "nao_identificado",
  "pedidos": [
    {
      "nome": "string",
      "resultado": "procedente" | "improcedente" | "parcialmente_procedente" | "nao_identificado",
      "valor_identificado": "number|null",
      "fundamentacao_resumida": "string|null",
      "trecho_relevante": "string|null"
    }
  ],
  "pontos_favoraveis": ["string"],
  "pontos_desfavoraveis": ["string"],
  "valores_identificados": { "valor_condenacao": "number|null", "custas": "number|null", "honorarios": "number|null" },
  "acordao": { "reforma_sentenca": "boolean|null" },
  "observacoes": ["string"],
  "necessita_revisao_humana": "boolean"
}
```

Definido em `backend/src/ai/schemas/decisionAnalysisSchema.js` e reaproveitado em dois pontos: como contrato enviado à Anthropic (`zodOutputFormat`) e como validação independente no backend antes de persistir. `"nao_identificado"` é convertido para `NULL` ao gravar em `processo_pedidos.resultado` (a coluna não aceita essa string).

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios, Recharts, lucide-react |
| Backend | Node.js, Express, Zod (validação de entrada e da resposta da IA), Multer (upload em memória), pdf-parse, mammoth |
| Banco de dados | PostgreSQL (driver `pg`, queries parametrizadas) |
| IA | Anthropic TypeScript SDK — Messages API com Structured Outputs |
| Testes | `node:test` + `node:assert` (nativos do Node, nenhuma dependência extra) |

## Instalação

Pré-requisitos: Node.js 18+, PostgreSQL, uma chave de API da Anthropic (opcional para rodar o sistema — só é necessária para usar a análise por IA).

```bash
# 1. Banco de dados
psql "postgresql://usuario:senha@localhost:5432/jurimetria" -f database/schema.sql
# opcional, só para desenvolvimento/demonstração - NUNCA em produção:
psql "postgresql://usuario:senha@localhost:5432/jurimetria" -f database/seed.sql

# 2. Backend
cd backend
cp .env.example .env   # preencha DATABASE_URL e, se for usar IA, ANTHROPIC_API_KEY
npm install
npm run dev             # http://localhost:3000

# 3. Frontend (em outro terminal)
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000 (padrão já funciona local)
npm install
npm run dev             # http://localhost:5173
```

## Execução dos testes

```bash
cd backend
npm test
```

Ver `backend/tests/README.md` para o que é coberto. Importante: **nenhum teste chama a Anthropic real nem precisa de um Postgres rodando** — tudo que toca banco ou IA é substituído por dublês de teste (mocks), exatamente para nunca consumir crédito de API nem exigir infraestrutura externa só para rodar a suíte.

## LGPD e anonimização

Antes de qualquer texto de decisão ser enviado à Anthropic, o backend (`AnonymizationService`) mascara, via expressões regulares: CPF, CNPJ, e-mail, telefone, CEP, RG e menções a dados bancários (agência/conta/PIX), além de uma heurística para linhas de endereço. O serviço **nunca remove** nomes de tribunal, comarca, vara, juiz, desembargador ou ministro — essa informação é necessária para os indicadores de jurimetria.

Limitação honesta, documentada também no código: é um mascaramento *best-effort* baseado em regex, não uma solução de NER (reconhecimento de entidades nomeadas). Nomes próprios de partes (ex: "João da Silva") não são removidos por este mecanismo. Para um ambiente de produção com maior volume de dados sensíveis, o caminho recomendado de evolução é uma abordagem de NER dedicada.

O backend também nunca loga a chave da Anthropic nem o texto completo de um documento nos logs de erro.

## Limitações conhecidas do MVP

- **Sem autenticação/login.** Decisão de escopo documentada em `database/README.md` — o diagrama de classes original do TCC menciona uma entidade `Usuario`, mas nenhum artefato de banco a implementa e o fluxo funcional do MVP não inclui tela de login.
- **Processamento em segundo plano sem fila persistente.** A análise por IA roda em um `Promise` solto dentro do próprio processo Node (sem Redis/BullMQ). Se o servidor reiniciar no meio de um processamento, essa análise específica fica presa em "Em Análise" — aceitável para o escopo de protótipo, mas o primeiro ponto a evoluir antes de um uso em produção real com volume.
- **Sem OCR.** PDFs escaneados (imagem, sem camada de texto) não têm o texto extraído; o usuário precisa colar o texto manualmente nesses casos.
- **Filesystem efêmero.** Nenhum arquivo enviado é gravado em disco (Multer usa `memoryStorage`) — necessário para compatibilidade com Render/Vercel, mas significa que o arquivo original não fica arquivado no servidor após a extração do texto.
- **Anonimização best-effort.** Ver seção LGPD acima.

## Deploy

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md) — guia passo a passo para Vercel (frontend), Render (backend) e Neon/Supabase/Railway (PostgreSQL), incluindo o checklist final de validação.

## Estrutura do repositório

```
sistema-jurimetria/
├── database/         # schema.sql, seed.sql, README com o histórico de correções do SQL original
├── backend/           # API Node.js/Express (routes/controllers/services/repositories/ai)
│   └── tests/          # suíte de testes (node:test)
├── frontend/          # SPA React/Vite
└── docs/
    └── DEPLOY.md       # guia de deploy e checklist final
```
