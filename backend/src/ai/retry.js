
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3; // 1 tentativa original + 2 retries
const BASE_DELAY_MS = 1000;

function isRetryableError(error) {
  const status = error?.status ?? error?.response?.status;
  if (RETRYABLE_STATUS.has(status)) return true;
  // Erros de rede sem status HTTP (timeout, conexão recusada etc).
  if (!status && (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT')) return true;
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry(fn) {
  let attempt = 0;
  let lastError;

  while (attempt < MAX_ATTEMPTS) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= MAX_ATTEMPTS || !isRetryableError(error)) {
        throw error;
      }
      await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

module.exports = { callWithRetry, isRetryableError };
