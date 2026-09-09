const test = require('node:test');
const assert = require('node:assert/strict');
const { anonymize } = require('../../src/services/anonymization.service');

test('anonymization.service', async (t) => {
  await t.test('remove CPF e conta ocorrências', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('O requerente, CPF 123.456.789-01, pleiteia...');
    assert.equal(textoAnonimizado.includes('[CPF_REMOVIDO]'), true);
    assert.equal(textoAnonimizado.includes('123.456.789-01'), false);
    assert.equal(ocorrencias.cpf, 1);
  });

  await t.test('conta múltiplas ocorrências do mesmo padrão', () => {
    const { ocorrencias } = anonymize('CPFs das partes: 111.222.333-44 e 555.666.777-88.');
    assert.equal(ocorrencias.cpf, 2);
  });

  await t.test('remove CNPJ', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('A empresa ré, CNPJ 12.345.678/0001-99, não contestou.');
    assert.equal(textoAnonimizado.includes('[CNPJ_REMOVIDO]'), true);
    assert.equal(ocorrencias.cnpj, 1);
  });

  await t.test('remove e-mail', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('Contato: fulano.silva@example.com.br');
    assert.equal(textoAnonimizado.includes('[EMAIL_REMOVIDO]'), true);
    assert.equal(ocorrencias.email, 1);
  });

  await t.test('remove telefone', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('Telefone para contato: (11) 91234-5678.');
    assert.equal(textoAnonimizado.includes('[TELEFONE_REMOVIDO]'), true);
    assert.equal(ocorrencias.telefone, 1);
  });

  await t.test('remove RG', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('Portador do RG nº 12.345.678-9, devidamente qualificado.');
    assert.equal(textoAnonimizado.includes('[RG_REMOVIDO]'), true);
    assert.equal(ocorrencias.rg, 1);
  });

  await t.test('remove dados bancários', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('Depósito judicial: Agência: 1234-5, Conta corrente: 98765-0.');
    assert.equal(textoAnonimizado.includes('[DADOS_BANCARIOS_REMOVIDO]'), true);
    assert.equal(ocorrencias.dados_bancarios >= 1, true);
  });

  await t.test('remove endereço', () => {
    const { textoAnonimizado, ocorrencias } = anonymize('Residente na Rua das Flores, 123, bairro Centro.');
    assert.equal(textoAnonimizado.includes('[ENDERECO_REMOVIDO]'), true);
    assert.equal(ocorrencias.endereco, 1);
  });

  await t.test('preserva nomes de tribunal, comarca, vara e juiz', () => {
    const original =
      'Processo julgado pelo Tribunal de Justiça de São Paulo, Comarca de Lins, 2ª Vara Cível, ' +
      'perante o Juiz Carlos Eduardo Mendes.';
    const { textoAnonimizado, ocorrencias } = anonymize(original);
    assert.equal(textoAnonimizado, original);
    const totalOcorrencias = Object.values(ocorrencias).reduce((a, b) => a + b, 0);
    assert.equal(totalOcorrencias, 0);
  });

  await t.test('lida com texto vazio ou nulo sem lançar erro', () => {
    assert.deepEqual(anonymize(''), { textoAnonimizado: '', ocorrencias: {} });
    assert.deepEqual(anonymize(null), { textoAnonimizado: null, ocorrencias: {} });
    assert.deepEqual(anonymize(undefined), { textoAnonimizado: undefined, ocorrencias: {} });
  });

  await t.test('anonimiza um texto combinando vários tipos de dado pessoal', () => {
    const texto =
      'Autor João, CPF 123.456.789-01, e-mail joao@exemplo.com, telefone (14) 99876-5432, ' +
      'residente na Avenida Brasil, 500. Réu: empresa CNPJ 98.765.432/0001-10.';
    const { textoAnonimizado, ocorrencias } = anonymize(texto);
    assert.equal(ocorrencias.cpf, 1);
    assert.equal(ocorrencias.email, 1);
    assert.equal(ocorrencias.telefone, 1);
    assert.equal(ocorrencias.endereco, 1);
    assert.equal(ocorrencias.cnpj, 1);
    assert.equal(textoAnonimizado.includes('João'), true, 'nome próprio da parte não é removido (limitação conhecida, documentada no serviço)');
  });
});
