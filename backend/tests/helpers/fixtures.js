// Payload válido de exemplo para decisionAnalysisSchema, reutilizado pelos
// testes do schema em si e pelos testes de orquestração
// (decisionAnalysisService), que precisam de uma resposta "da IA" fake
// mas estruturalmente válida.
function validAnalysisPayload(overrides = {}) {
  return {
    tipo_documento: 'sentenca',
    resumo: 'Resumo de teste da decisão.',
    processo: { numero_processo: null, tribunal: null, comarca: null, vara: null },
    julgador: { nome: 'Fulano de Tal', tipo: 'juiz' },
    data_decisao: '2024-01-15',
    resultado_geral: 'procedente',
    pedidos: [
      {
        nome: 'Horas extras',
        resultado: 'procedente',
        valor_identificado: 1000,
        fundamentacao_resumida: 'Comprovado por cartão de ponto.',
        trecho_relevante: 'Julgo procedente o pedido de horas extras.',
      },
    ],
    pontos_favoraveis: ['Comprovação documental robusta.'],
    pontos_desfavoraveis: [],
    valores_identificados: { valor_condenacao: 1000, custas: null, honorarios: null },
    acordao: { reforma_sentenca: null },
    observacoes: [],
    necessita_revisao_humana: false,
    ...overrides,
  };
}

module.exports = { validAnalysisPayload };
