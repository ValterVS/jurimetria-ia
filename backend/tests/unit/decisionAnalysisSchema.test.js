const test = require('node:test');
const assert = require('node:assert/strict');
const { decisionAnalysisSchema } = require('../../src/ai/schemas/decisionAnalysisSchema');
const { validAnalysisPayload } = require('../helpers/fixtures');

test('decisionAnalysisSchema', async (t) => {
  await t.test('aceita um payload válido completo', () => {
    const result = decisionAnalysisSchema.safeParse(validAnalysisPayload());
    assert.equal(result.success, true);
  });

  await t.test('aceita "nao_identificado" como resultado (é um valor válido do enum)', () => {
    const payload = validAnalysisPayload({ resultado_geral: 'nao_identificado' });
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, true);
  });

  await t.test('aceita valores nulos em campos nullable (não identificado pela IA)', () => {
    const payload = validAnalysisPayload({
      data_decisao: null,
      julgador: { nome: null, tipo: 'nao_identificado' },
      processo: { numero_processo: null, tribunal: null, comarca: null, vara: null },
    });
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, true);
  });

  await t.test('rejeita quando falta um campo obrigatório (resumo)', () => {
    const payload = validAnalysisPayload();
    delete payload.resumo;
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('rejeita valor de enum inválido em resultado_geral', () => {
    const payload = validAnalysisPayload({ resultado_geral: 'ganhou' });
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('rejeita tipo errado (valor_identificado como string)', () => {
    const payload = validAnalysisPayload();
    payload.pedidos[0].valor_identificado = 'mil reais';
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('rejeita necessita_revisao_humana ausente (campo obrigatório, não nullable)', () => {
    const payload = validAnalysisPayload();
    delete payload.necessita_revisao_humana;
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('rejeita "pedidos" que não seja um array', () => {
    const payload = validAnalysisPayload({ pedidos: 'nenhum' });
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('aceita pedidos como array vazio (nenhum pedido identificado no texto)', () => {
    const payload = validAnalysisPayload({ pedidos: [] });
    const result = decisionAnalysisSchema.safeParse(payload);
    assert.equal(result.success, true);
  });
});
