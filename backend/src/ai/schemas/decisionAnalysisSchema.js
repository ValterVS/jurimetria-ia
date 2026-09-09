const { z } = require('zod');

// Schema estruturado da resposta da IA para análise de sentenças/acórdãos.
//
// Regra importante para Structured Outputs em modo estrito da Anthropic:
// todo campo precisa estar sempre presente no objeto retornado. Por isso
// usamos `.nullable()` (o campo existe, mas pode vir null) em vez de
// `.optional()` (que removeria o campo) em qualquer informação que a IA
// possa não conseguir identificar no documento.
//
// Este mesmo schema é usado em dois pontos:
//   1) como referência para o JSON Schema escrito à mão em
//      anthropicProvider.js (enviado à Anthropic via `output_config.format`,
//      o recurso "Structured Outputs" da Claude API - ver comentário em
//      anthropicProvider.js sobre por que o JSON Schema é escrito à mão em
//      vez de gerado a partir deste schema Zod);
//   2) como validação independente no backend antes de persistir
//      (nunca confiamos apenas na garantia do lado da Anthropic).
//
// Observação de mapeamento para o banco (ver Fase 7):
// 'nao_identificado' é um valor válido de resultado aqui, mas a coluna
// processo_pedidos.resultado só aceita procedente/improcedente/
// parcialmente_procedente (ou NULL). 'nao_identificado' deve ser
// convertido para NULL ao persistir - NUNCA gravado como string na coluna.

const resultadoPedidoEnum = z.enum([
  'procedente',
  'improcedente',
  'parcialmente_procedente',
  'nao_identificado',
]);

const pedidoAnalisadoSchema = z.object({
  nome: z.string(),
  resultado: resultadoPedidoEnum,
  valor_identificado: z.number().nullable(),
  fundamentacao_resumida: z.string().nullable(),
  trecho_relevante: z.string().nullable(),
});

const julgadorSchema = z.object({
  nome: z.string().nullable(),
  tipo: z.enum(['juiz', 'desembargador', 'ministro', 'nao_identificado']),
});

const processoIdentificadoSchema = z.object({
  numero_processo: z.string().nullable(),
  tribunal: z.string().nullable(),
  comarca: z.string().nullable(),
  vara: z.string().nullable(),
});

const valoresIdentificadosSchema = z.object({
  valor_condenacao: z.number().nullable(),
  custas: z.number().nullable(),
  honorarios: z.number().nullable(),
});

// Só é relevante quando tipo_documento = 'acordao'; para sentenças a IA
// deve retornar este objeto com reforma_sentenca = null.
const acordaoInfoSchema = z.object({
  reforma_sentenca: z.boolean().nullable(),
});

const decisionAnalysisSchema = z.object({
  tipo_documento: z.enum(['sentenca', 'acordao']),
  resumo: z.string(),
  processo: processoIdentificadoSchema,
  julgador: julgadorSchema,
  // formato esperado 'AAAA-MM-DD' ou null; validação de formato estrita
  // acontece no backend (Fase 7), não neste schema enviado à Anthropic.
  data_decisao: z.string().nullable(),
  resultado_geral: resultadoPedidoEnum,
  pedidos: z.array(pedidoAnalisadoSchema),
  pontos_favoraveis: z.array(z.string()),
  pontos_desfavoraveis: z.array(z.string()),
  valores_identificados: valoresIdentificadosSchema,
  acordao: acordaoInfoSchema,
  observacoes: z.array(z.string()),
  necessita_revisao_humana: z.boolean(),
});

module.exports = { decisionAnalysisSchema, resultadoPedidoEnum };
