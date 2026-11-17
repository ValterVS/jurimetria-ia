// Validação leve das variáveis de ambiente na subida do servidor: não
// derruba o processo, só avisa no log o que está faltando.
const REQUIRED_ALWAYS = ['DATABASE_URL'];
const REQUIRED_FOR_AI = ['ANTHROPIC_API_KEY'];

function checkMissing(keys) {
  return keys.filter((key) => !process.env[key] || process.env[key].trim() === '');
}

function validateEnv() {
  const missingCore = checkMissing(REQUIRED_ALWAYS);
  const missingAI = checkMissing(REQUIRED_FOR_AI);

  if (missingCore.length > 0) {
    console.warn(
      `[config] Variáveis de ambiente essenciais ausentes: ${missingCore.join(', ')}. ` +
        'O servidor vai subir, mas rotas que dependem do banco vão falhar.'
    );
  }

  if (missingAI.length > 0) {
    console.warn(
      `[config] Variáveis de IA ausentes: ${missingAI.join(', ')}. ` +
        'Funcionalidades de análise por IA não vão funcionar até isso ser configurado.'
    );
  }
}

module.exports = { validateEnv };
