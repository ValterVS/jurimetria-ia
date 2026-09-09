// Singleton "preguiçoso": só cria o client de verdade na primeira chamada
// que precisar dele, e só então falha se a chave não estiver configurada.
// Isso permite o servidor subir normalmente mesmo sem ANTHROPIC_API_KEY
// definida (as rotas de análise por IA é que vão falhar, de forma
// controlada, quando forem chamadas - ver config/env.js).
//
// O `require('@anthropic-ai/sdk')` também é feito aqui dentro (lazy), e
// não no topo do arquivo: assim, mesmo o PACOTE '@anthropic-ai/sdk'
// estando ausente do node_modules (ex: dependência adicionada ao
// package.json depois do último `npm install`), o servidor inteiro
// continua subindo normalmente - só a análise por IA fica indisponível
// até o pacote ser instalado. (Esse cuidado existia também no provider da
// OpenAI que este arquivo substituiu, depois de um bug real encontrado em
// produção local: um require() de topo derrubava o boot inteiro do
// servidor por causa só do módulo de IA.)
let client = null;

const REQUEST_TIMEOUT_MS = 60_000;

function getAnthropicClient() {
  if (client) {
    return client;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const error = new Error(
      'ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente para usar a análise por IA.'
    );
    error.status = 503;
    throw error;
  }

  const Anthropic = require('@anthropic-ai/sdk');

  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });

  return client;
}

module.exports = { getAnthropicClient };
