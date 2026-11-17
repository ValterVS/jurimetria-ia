
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
