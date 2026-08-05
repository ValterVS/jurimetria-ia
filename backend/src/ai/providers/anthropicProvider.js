const { getAnthropicClient } = require('../anthropicClient');
const { callWithRetry } = require('../retry');
const { decisionAnalysisSchema, resultadoPedidoEnum } = require('../schemas/decisionAnalysisSchema');
const { DECISION_ANALYSIS_SYSTEM_PROMPT } = require('../prompts/decisionAnalysisPrompt');
const { httpError } = require('../../utils/httpError');

// Sonnet 5 usa effort "high" por padrão na API, e o parâmetro `effort`
// afeta TODOS os tokens da resposta, inclusive o "pensamento" interno do
// modelo (adaptive thinking) - esse pensamento consome do mesmo orçamento
// de max_tokens que o JSON final. Para uma tarefa de extração/classificação
// como esta (não é raciocínio complexo nem uso de ferramentas em várias
// etapas), a própria documentação da Anthropic recomenda um effort mais
// baixo. Reduzir para "medium" e aumentar a folga de max_tokens evita
// truncar a resposta (stop_reason: 'max_tokens') antes do JSON estar
// completo - foi exatamente isso que aconteceu com max_tokens: 4000 e o
// effort padrão "high".
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_EFFORT = 'medium';
const DEFAULT_MODEL = 'claude-sonnet-5';

// JSON Schema enviado à Anthropic via `output_config.format` (recurso oficial
// "Structured Outputs" da Claude API - https://platform.claude.com/docs/en/build-with-claude/structured-outputs,
// verificado diretamente na documentação oficial nesta migração).
//
// Escrito à mão (não gerado a partir do Zod) de propósito: o pacote
// @anthropic-ai/sdk efetivamente instalado neste projeto não inclui o helper
// `zodOutputFormat` (isso já causou um erro real em produção local -
// "Cannot find module .../helpers/zod.js" - porque a versão instalada só
// expõe `helpers/beta/zod.js`, com um helper diferente, `betaZodTool`, para
// outro caso de uso). Escrever o JSON Schema manualmente evita depender de
// um helper que pode não existir na versão do SDK instalada pelo usuário, e
// evita misturar a API do Zod v3 (usada em decisionAnalysisSchema.js) com a
// API do Zod v4 que esse helper exigiria internamente.
//
// O `decisionAnalysisSchema` (Zod v3) continua sendo a fonte de verdade para
// a validação independente da resposta, feita mais abaixo - nunca confiamos
// apenas na garantia do lado da Anthropic.
const ANALISE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    tipo_documento: { type: 'string', enum: ['sentenca', 'acordao'] },
    resumo: { type: 'string' },
    processo: {
      type: 'object',
      properties: {
        numero_processo: { type: ['string', 'null'] },
        tribunal: { type: ['string', 'null'] },
        comarca: { type: ['string', 'null'] },
        vara: { type: ['string', 'null'] },
      },
      required: ['numero_processo', 'tribunal', 'comarca', 'vara'],
      additionalProperties: false,
    },
    julgador: {
      type: 'object',
      properties: {
        nome: { type: ['string', 'null'] },
        tipo: { type: 'string', enum: ['juiz', 'desembargador', 'ministro', 'nao_identificado'] },
      },
      required: ['nome', 'tipo'],
      additionalProperties: false,
    },
    data_decisao: { type: ['string', 'null'] },
    resultado_geral: { type: 'string', enum: resultadoPedidoEnum.options },
    pedidos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          resultado: { type: 'string', enum: resultadoPedidoEnum.options },
          valor_identificado: { type: ['number', 'null'] },
          fundamentacao_resumida: { type: ['string', 'null'] },
          trecho_relevante: { type: ['string', 'null'] },
        },
        required: ['nome', 'resultado', 'valor_identificado', 'fundamentacao_resumida', 'trecho_relevante'],
        additionalProperties: false,
      },
    },
    pontos_favoraveis: { type: 'array', items: { type: 'string' } },
    pontos_desfavoraveis: { type: 'array', items: { type: 'string' } },
    valores_identificados: {
      type: 'object',
      properties: {
        valor_condenacao: { type: ['number', 'null'] },
        custas: { type: ['number', 'null'] },
        honorarios: { type: ['number', 'null'] },
      },
      required: ['valor_condenacao', 'custas', 'honorarios'],
      additionalProperties: false,
    },
    acordao: {
      type: 'object',
      properties: {
        reforma_sentenca: { type: ['boolean', 'null'] },
      },
      required: ['reforma_sentenca'],
      additionalProperties: false,
    },
    observacoes: { type: 'array', items: { type: 'string' } },
    necessita_revisao_humana: { type: 'boolean' },
  },
  required: [
    'tipo_documento',
    'resumo',
    'processo',
    'julgador',
    'data_decisao',
    'resultado_geral',
    'pedidos',
    'pontos_favoraveis',
    'pontos_desfavoraveis',
    'valores_identificados',
    'acordao',
    'observacoes',
    'necessita_revisao_humana',
  ],
  additionalProperties: false,
};

// Procura o primeiro bloco de texto na resposta. Com Structured Outputs, é
// nele que vem o JSON (ver `output_config.format` acima); também é usado
// para extrair a mensagem de recusa quando stop_reason === 'refusal'.
function extractTextBlock(response) {
  const blocks = Array.isArray(response.content) ? response.content : [];
  const textBlock = blocks.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : null;
}

// Implementação do contrato AIProvider (ver ../aiProvider.js) usando a API
// de Mensagens da Anthropic com Structured Outputs (`output_config.format`,
// tipo `json_schema`): a resposta vem garantidamente em JSON compatível com
// o schema, num bloco de texto - sem necessidade de "tool use" nem de
// helpers de conversão Zod->JSON Schema de terceiros.
async function analyzeDecision({ texto, tipoDocumentoSugerido = null }) {
  if (!texto || !texto.trim()) {
    throw httpError(400, 'Documento vazio: não há texto para enviar à análise de IA.');
  }

  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || DEFAULT_MAX_TOKENS;
  const effort = process.env.ANTHROPIC_EFFORT || DEFAULT_EFFORT;

  const userContent = tipoDocumentoSugerido
    ? `Tipo de documento informado pelo usuário ao cadastrar: ${tipoDocumentoSugerido}.\n\nTexto da decisão (já anonimizado):\n\n${texto}`
    : `Texto da decisão (já anonimizado):\n\n${texto}`;

  let response;
  try {
    response = await callWithRetry(() =>
      client.messages.create({
        model,
        max_tokens: maxTokens,
        system: DECISION_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        output_config: {
          format: { type: 'json_schema', schema: ANALISE_JSON_SCHEMA },
          effort,
        },
      })
    );
  } catch (error) {
    // Erros do SDK (rede, timeout, rate limit persistente após os
    // retries, chave inválida etc). Nunca repassamos a mensagem crua do
    // SDK/stack para além do necessário, mas mantemos texto suficiente
    // para diagnóstico em erro_log.
    throw httpError(502, `Falha na comunicação com a Anthropic: ${error.message}`);
  }

  if (response.stop_reason === 'max_tokens' || response.stop_reason === 'model_context_window_exceeded') {
    throw httpError(
      502,
      'A resposta da IA ficou incompleta (limite de tokens atingido). O documento pode ser grande demais para o limite configurado.'
    );
  }

  if (response.stop_reason === 'refusal') {
    const refusalMessage = extractTextBlock(response) || 'motivo não especificado pelo modelo';
    throw httpError(422, `A IA recusou-se a analisar este documento: ${refusalMessage}`);
  }

  const textBlock = extractTextBlock(response);
  if (!textBlock) {
    throw httpError(502, 'A IA não retornou uma resposta estruturada válida.');
  }

  let parsedOutput;
  try {
    parsedOutput = JSON.parse(textBlock);
  } catch (error) {
    throw httpError(502, 'A resposta da IA não pôde ser interpretada como JSON válido.');
  }

  // Segunda validação, independente do que o Structured Outputs da Anthropic
  // já garante: nunca usar a resposta da IA sem validar novamente no
  // backend (com o schema Zod, fonte de verdade do projeto) antes de
  // persistir.
  const validation = decisionAnalysisSchema.safeParse(parsedOutput);
  if (!validation.success) {
    throw httpError(502, 'A resposta estruturada da IA não passou na validação do schema no backend.');
  }

  return {
    data: validation.data,
    model: response.model || model,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

module.exports = { analyzeDecision };
