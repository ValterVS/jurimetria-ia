const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { clearCache } = require('../helpers/mockRequire');

const servicePath = require.resolve(path.resolve(__dirname, '../../src/services/email.service.js'));

function comEnv(vars, fn) {
  const anteriores = {};
  for (const [k, v] of Object.entries(vars)) {
    anteriores[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  clearCache(servicePath);
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(anteriores)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    clearCache(servicePath);
  });
}

test('email.service - envio via Brevo (HTTPS) quando BREVO_API_KEY está definida', async (t) => {
  await t.test('chama a API da Brevo com remetente, destinatário e código', async () => {
    const fetchOriginal = global.fetch;
    const chamadas = [];
    global.fetch = async (url, opts) => {
      chamadas.push({ url, opts });
      return { ok: true, status: 201, text: async () => '' };
    };
    try {
      await comEnv({ BREVO_API_KEY: 'chave-teste', EMAIL_FROM: 'remetente@teste.com', SMTP_HOST: undefined }, async () => {
        const { enviarCodigoVerificacao } = require(servicePath);
        await enviarCodigoVerificacao({ nome_empresa: 'Empresa X', email: 'cliente@teste.com' }, '123456');
      });
      assert.equal(chamadas.length, 1);
      assert.equal(chamadas[0].url, 'https://api.brevo.com/v3/smtp/email');
      assert.equal(chamadas[0].opts.headers['api-key'], 'chave-teste');
      const corpo = JSON.parse(chamadas[0].opts.body);
      assert.equal(corpo.sender.email, 'remetente@teste.com');
      assert.equal(corpo.to[0].email, 'cliente@teste.com');
      assert.equal(corpo.htmlContent.includes('123456'), true);
    } finally {
      global.fetch = fetchOriginal;
    }
  });

  await t.test('erro da Brevo vira erro 502 (nunca vaza a chave)', async () => {
    const fetchOriginal = global.fetch;
    global.fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
    try {
      await comEnv({ BREVO_API_KEY: 'chave-secreta', EMAIL_FROM: 'r@teste.com' }, async () => {
        const { enviarCodigoVerificacao } = require(servicePath);
        await assert.rejects(
          () => enviarCodigoVerificacao({ nome_empresa: 'X', email: 'c@teste.com' }, '000000'),
          (err) => err.status === 502 && !err.message.includes('chave-secreta')
        );
      });
    } finally {
      global.fetch = fetchOriginal;
    }
  });
});
