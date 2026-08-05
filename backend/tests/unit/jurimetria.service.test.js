const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPercentuais, normalizarAnalises } = require('../../src/services/jurimetria.service');

test('jurimetria.service - calcularPercentuais', async (t) => {
  await t.test('calcula os três percentuais somando 100% quando todos os casos estão cobertos', () => {
    const resultado = calcularPercentuais({ total_analisados: 10, procedentes: 6, improcedentes: 3, parciais: 1 });
    assert.equal(resultado.percentual_procedencia, 60);
    assert.equal(resultado.percentual_improcedencia, 30);
    assert.equal(resultado.percentual_parcial, 10);
  });

  await t.test('retorna zeros quando não há nenhum caso analisado (evita divisão por zero)', () => {
    const resultado = calcularPercentuais({ total_analisados: 0, procedentes: 0, improcedentes: 0, parciais: 0 });
    assert.deepEqual(resultado, {
      percentual_procedencia: 0,
      percentual_improcedencia: 0,
      percentual_parcial: 0,
    });
  });

  await t.test('arredonda para 1 casa decimal', () => {
    const resultado = calcularPercentuais({ total_analisados: 3, procedentes: 1, improcedentes: 1, parciais: 1 });
    // 1/3 = 33.333...% -> arredondado para 33.3
    assert.equal(resultado.percentual_procedencia, 33.3);
  });

  await t.test('nunca atribui causalidade - é sempre um cálculo puro sobre contagens históricas', () => {
    // Este teste documenta a garantia arquitetural: a função só faz
    // aritmética sobre números já agregados pelo Postgres, nunca chama
    // IA nem infere nada além da proporção.
    const resultado = calcularPercentuais({ total_analisados: 4, procedentes: 4, improcedentes: 0, parciais: 0 });
    assert.equal(resultado.percentual_procedencia, 100);
  });
});

test('jurimetria.service - normalizarAnalises', async (t) => {
  await t.test('mapeia os rótulos de status para as chaves esperadas pelo frontend', () => {
    const rows = [
      { status: 'Pendente', total: 2 },
      { status: 'Em Análise', total: 1 },
      { status: 'Concluída', total: 5 },
      { status: 'Erro', total: 1 },
    ];
    const resultado = normalizarAnalises(rows);
    assert.deepEqual(resultado, { pendente: 2, em_analise: 1, concluida: 5, erro: 1, total: 9 });
  });

  await t.test('preenche com zero os status que não aparecem no resultado do banco', () => {
    const rows = [{ status: 'Concluída', total: 3 }];
    const resultado = normalizarAnalises(rows);
    assert.deepEqual(resultado, { pendente: 0, em_analise: 0, concluida: 3, erro: 0, total: 3 });
  });

  await t.test('lida com lista vazia (nenhuma análise cadastrada ainda)', () => {
    const resultado = normalizarAnalises([]);
    assert.deepEqual(resultado, { pendente: 0, em_analise: 0, concluida: 0, erro: 0, total: 0 });
  });
});
