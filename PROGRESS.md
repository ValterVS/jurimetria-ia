# PROGRESS.md — Estado atual do desenvolvimento

> Última atualização: 2026-09-09. Ver `CLAUDE.md` para arquitetura e detalhes técnicos.

## Resumo em uma frase

O sistema está funcionalmente completo para o escopo do TCC (CRUD completo, análise por
IA, painel de jurimetria) e testado estaticamente; falta apenas o usuário validar a
integração com Claude ao vivo, na própria máquina, com uma chave de API real.

## O que já está funcionando (verificado)

- **CRUD completo** de processos, partes, pedidos, sentenças e acórdãos.
- **9 catálogos auxiliares** (tribunal, comarca, vara, juiz, desembargador, ministro,
  tipo_parte, tipo_sentenca, tipo_acordao, situação de processo) via fábrica genérica de
  repository/service/controller no backend e uma tela CRUD genérica no frontend.
- **Upload e extração de texto** de decisões em PDF (`pdf-parse`) e DOCX (`mammoth`).
- **Anonimização automática (LGPD)** de CPF, CNPJ, e-mail, telefone, CEP, RG e dados
  bancários antes de qualquer texto sair do servidor.
- **Pipeline de análise por IA** ponta a ponta: criação do registro com status Pendente
  → resposta HTTP imediata (202) → processamento em segundo plano → anonimização →
  chamada à Anthropic Claude com Structured Outputs → validação independente com Zod no
  backend → persistência do resultado → status Concluída (ou Erro, preservando sempre a
  decisão e a análise).
- **Painel de jurimetria** com abas por julgador, por pedido e por tribunal, alimentado
  por consultas agregadas no PostgreSQL (a IA nunca calcula estatística, só faz leitura
  semântica de um documento por vez).
- **Migração completa de OpenAI para Anthropic Claude** — a troca de provedor ficou
  contida inteiramente na pasta `backend/src/ai/`, sem tocar em controllers/services,
  validando a decisão de arquitetura da camada `AIProvider`.
- **64/64 testes automatizados passando** (`node:test`, rodados via `npm test` no
  backend) — confirmado repetidamente nesta sessão, inclusive após cada correção de bug.
- **`node --check` limpo** em todos os arquivos alterados (sem erros de sintaxe).
- **Dois PDFs de apresentação entregues** em `C:\Users\valte\Downloads\TCC\`:
  - `Sistema_Jurimetria_Documentacao_Tecnica.pdf` (20 páginas, com diagramas) —
    explica todo o funcionamento do sistema, arquivo por arquivo, para a apresentação.
  - `Sistema_Jurimetria_Diferencas_Original_x_Entregue.pdf` (11 páginas) — compara o
    banco de dados e demais decisões do TCC original com o que foi de fato entregue.

## Bugs corrigidos nesta sessão

1. `Cannot find module '.../@anthropic-ai/sdk/helpers/zod.js'` — causado por usar uma
   função (`zodOutputFormat`) que não existe na versão instalada do SDK. Corrigido
   reescrevendo `anthropicProvider.js` para usar `output_config` com um JSON Schema
   escrito à mão, via `client.messages.create()` puro.
2. `A resposta da IA ficou incompleta (limite de tokens atingido)` — causado por
   `max_tokens` baixo demais somado ao `effort` padrão alto do Claude Sonnet 5 (que gasta
   tokens também com "pensamento" interno). Corrigido subindo o default para 8000 tokens
   e o `effort` padrão para `medium`, ambos configuráveis via env var.
3. Chave real da OpenAI encontrada em texto plano em `backend/.env` — não vazada (arquivo
   já estava no `.gitignore`), mas removida e substituída pelas variáveis da Anthropic.
   Usuário foi orientado a revogar a chave antiga.

## O que NÃO está implementado

- **Autenticação/login.** Não há tela de login nem controle de acesso — qualquer pessoa
  com a URL consegue usar o sistema livremente. Estava no diagrama de classes original
  do TCC mas não foi implementado.
- **Fila de jobs persistente** para o processamento em segundo plano da IA (é
  fire-and-forget em memória hoje; uma queda do processo no meio de uma análise deixa o
  registro preso em "Em Análise").
- **OCR** para PDFs escaneados (só funciona com PDFs que já têm camada de texto).
- **NER real** para anonimização (hoje é regex, cobre os padrões comuns de CPF/CNPJ/etc.
  mas não nomes próprios em texto livre).

## O que falta verificar (não é "não implementado", é "não testado ao vivo")

- **Teste end-to-end real da chamada à Anthropic API** com uma chave válida. O ambiente
  onde as correções foram feitas não tem acesso de rede à internet (nem para instalar
  pacotes, nem para chamar `api.anthropic.com` diretamente — confirmado que o proxy do
  sandbox bloqueia ambos). Toda a verificação das correções desta sessão foi estática:
  leitura do código-fonte real do SDK instalado, `node --check`, e a suíte de testes
  mockada (64/64 passando). **Isso precisa ser confirmado pelo usuário na própria
  máquina.**

## Próxima tarefa exata

**Não há tarefa de código pendente por parte do desenvolvimento.** A próxima ação é do
usuário: rodar o sistema na própria máquina com `ANTHROPIC_API_KEY` configurada e
confirmar que uma análise de decisão completa (upload → anonimização → chamada à IA →
validação → persistência → exibição do resultado) funciona sem os erros que motivaram as
correções desta sessão. Se aparecer qualquer novo erro nesse teste real, essa é a
próxima coisa a trazer para uma nova sessão de trabalho.

Se esse teste passar sem problemas, os únicos itens em aberto são de escopo/decisão do
usuário, não de bug: se vale a pena adicionar autenticação antes da defesa do TCC, e
revogar a chave antiga da OpenAI que ficou exposta em `.env`.
