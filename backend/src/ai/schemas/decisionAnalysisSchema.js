const { z } = require('zod');

// Schema da resposta da IA para análise de sentenças/acórdãos. Usado tanto
// como referência do JSON Schema em anthropicProvider.js quanto para
// validação independente no backend antes de persistir.
//
// 'nao_identificado' é convertido para NULL ao gravar em
// processo_pedidos.resultado (a coluna não aceita essa string).

const resultadoPedidoEnum = z.enum([
  'procedente',
  'improcedente',
  'parcialmente_procedente',
  'objeto_de_transacao',
  'nao_identificado',
]);

// 'objeto_de_transacao' também é convertido para NULL ao gravar em
// processo_pedidos.resultado, pelo mesmo motivo.
const tipoDocumentoEnum = z.enum([
  'sentenca',
  'acordao',
  'despacho',
  'intimacao',
  'decisao_interlocutoria',
  'decisao_declaratoria',
]);

const pedidoAnalisadoSchema = z.object({
  nome: z.string(),
  // fundamento que diferencia pedidos de mesmo nome na mesma decisão (ex:
  // "danos morais" por rescisão x por dano existencial); null se único
  descricao: z.string().nullable().optional(),
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

// Relevante só quando tipo_documento = 'acordao'. Os campos de cadastro
// (tipo, relator, desembargadores) são opcionais para aceitar análises antigas.
const acordaoInfoSchema = z.object({
  reforma_sentenca: z.boolean().nullable(),
  tipo_acordao: z.string().nullable().optional(),
  relator: z.string().nullable().optional(),
  desembargador1: z.string().nullable().optional(),
  desembargador2: z.string().nullable().optional(),
});

const decisionAnalysisSchema = z.object({
  tipo_documento: tipoDocumentoEnum,
  resumo: z.string(),
  processo: processoIdentificadoSchema,
  julgador: julgadorSchema,
  // formato esperado 'AAAA-MM-DD' ou null
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

module.exports = { decisionAnalysisSchema, resultadoPedidoEnum, tipoDocumentoEnum };
