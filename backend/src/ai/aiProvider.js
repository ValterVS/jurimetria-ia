// Ponto único de indireção para o provedor de IA usado pelo sistema.
//
// Contrato que qualquer provider precisa cumprir:
//
//   analyzeDecision({ texto: string, tipoDocumentoSugerido?: 'sentenca' | 'acordao' })
//     -> Promise<{
//          data: object,              // objeto validado contra decisionAnalysisSchema
//          model: string,             // nome/id do modelo que gerou a resposta
//          inputTokens: number|null,
//          outputTokens: number|null,
//        }>
//
// Nesta versão do projeto SOMENTE a Anthropic (Claude) está implementada
// (anthropicProvider.js) - o projeto usava a OpenAI originalmente e foi
// migrado integralmente para a Claude API, sem alterar este contrato. A
// indireção existe para permitir, futuramente, plugar um
// LocalLLMProvider ou GeminiProvider sem alterar o
// DecisionAnalysisService (Fase 7), que depende apenas deste contrato.
const anthropicProvider = require('./providers/anthropicProvider');

function getAIProvider() {
  return anthropicProvider;
}

module.exports = { getAIProvider };
