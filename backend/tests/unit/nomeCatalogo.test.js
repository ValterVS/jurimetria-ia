const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { normalizarChave, formatarNome } = require(path.resolve(__dirname, '../../src/utils/nomeCatalogo.js'));

test('normalizarChave ignora maiúscula, acento e espaços extras', () => {
  assert.equal(normalizarChave('  LÍNS '), 'lins');
  assert.equal(normalizarChave('Lins'), normalizarChave('lins'));
  assert.equal(normalizarChave('São   Paulo'), 'sao paulo');
});

test('formatarNome capitaliza palavras em minúsculo e mantém conectores', () => {
  assert.equal(formatarNome('lins'), 'Lins');
  assert.equal(formatarNome('tribunal de justiça de são paulo'), 'Tribunal de Justiça de São Paulo');
  assert.equal(formatarNome('1ª vara cível de lins'), '1ª Vara Cível de Lins');
});

test('formatarNome preserva siglas e palavras que já têm maiúscula', () => {
  assert.equal(formatarNome('TRT 15ª Região'), 'TRT 15ª Região');
  assert.equal(formatarNome('vara do TJSP'), 'Vara do TJSP');
});
