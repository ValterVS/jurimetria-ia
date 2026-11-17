const { getAnthropicClient } = require('../anthropicClient');
const { callWithRetry } = require('../retry');
const { decisionAnalysisSchema, resultadoPedidoEnum, tipoDocumentoEnum } = require('../schemas/decisionAnalysisSchema');
const { DECISION_ANALYSIS_SYSTEM_PROMPT } = require('../prompts/decisionAnalysisPrompt');
const { httpError } = require('../../utils/httpError');

// effort "medium" e max_tokens com folga evitam truncar a resposta
// (stop_reason: 'max_tokens') antes do JSON estar completo.
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_EFFORT = 'medium';
const DEFAULT_MODEL = 'claude-sonnet-5';

// JSON Schema enviado à Anthropic via `output_config.format` (Structured
// Outputs). Escrito à mão em vez de gerado a partir do Zod, pois a versão
// do SDK instalada não inclui o helper `zodOutputFormat` compatível com
// Zod v3 (usado em decisionAnalysisSchema.js, que segue como fonte de
// verdade para a validação independente feita mais abaixo).
const ANALISE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    tipo_documento: { type: 'string', enum: tipoDocumentoEnum.options },
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
          descricao: { type: ['string', 'null'] },
          resultado: { type: 'string', enum: resultadoPedidoEnum.options },
          valor_identificado: { type: ['number', 'null'] },
          fundamentacao_resumida: { type: ['string', 'null'] },
          trecho_relevante: { type: ['string', 'null'] },
        },
        required: ['nome', 'descricao', 'resultado', 'valor_identificado', 'fundamentacao_resumida', 'trecho_relevante'],
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
        tipo_acordao: { type: ['string', 'null'] },
        relator: { type: ['string', 'null'] },
        desembargador1: { type: ['string', 'null'] },
        desembargador2: { type: ['string', 'null'] },
      },
      required: ['reforma_sentenca', 'tipo_acordao', 'relator', 'desembargador1', 'desembargador2'],
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

// Primeiro bloco de texto da resposta: é onde vem o JSON, ou a mensagem
// de recusa quando stop_reason === 'refusal'.
function extractTextBlock(response) {
  const blocks = Array.isArray(response.content) ? response.content : [];
  const textBlock = blocks.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : null;
}

// Implementação do contrato AIProvider (ver ../aiProvider.js).
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
    // erros do SDK (rede, timeout, rate limit, chave inválida etc)
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

  // segunda validação independente, com Zod, antes de persistir
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
