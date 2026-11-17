// A API da Anthropic recusa (400) schemas com mais de 16 parâmetros "union"
// (type com array, como ['string','null'], ou anyOf). Este teste evita que um
// campo novo estoure o limite só em produção.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ANALISE_JSON_SCHEMA } = require('../../src/ai/providers/anthropicProvider');

const LIMITE_UNIONS = 16;

function contarUnions(no) {
  if (!no || typeof no !== 'object') return 0;
  let total = Array.isArray(no.type) || no.anyOf ? 1 : 0;
  for (const valor of Object.values(no)) {
    if (Array.isArray(valor)) valor.forEach((v) => { total += contarUnions(v); });
    else if (valor && typeof valor === 'object') total += contarUnions(valor);
  }
  return total;
}

test('schema enviado à Anthropic respeita o limite de parâmetros com union types', () => {
  const total = contarUnions(ANALISE_JSON_SCHEMA);
  assert.ok(total <= LIMITE_UNIONS, `${total} parâmetros com union (limite ${LIMITE_UNIONS})`);
});
