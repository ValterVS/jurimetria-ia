const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPercentuais, agruparPorJuiz, agruparPorDesembargador, chancesDoJulgador } = require('../../src/services/jurimetria.service');

test('jurimetria.service - agruparPorJuiz', async (t) => {
  const linha = (id_juiz, nome_juiz, id_pedido, nome_pedido, v) => ({
    id_juiz, nome_juiz, id_pedido, nome_pedido,
    total: v[0] + v[1] + v[2] + v[3], procedentes: v[0], improcedentes: v[1], parciais: v[2], sem_resultado: v[3],
  });

  await t.test('soma os pedidos de cada juiz e calcula percentuais incluindo "sem resultado"', () => {
    const [juiz] = agruparPorJuiz([
      linha(1, 'Ana', 10, 'Horas extras', [3, 1, 0, 0]),
      linha(1, 'Ana', 11, 'Danos morais', [0, 2, 0, 2]),
    ]);
    assert.equal(juiz.total, 8);
    assert.equal(juiz.procedentes, 3);
    assert.equal(juiz.improcedentes, 3);
    assert.equal(juiz.sem_resultado, 2);
    assert.equal(juiz.percentual_procedente, 37.5);
    assert.equal(juiz.percentual_sem_resultado, 25);
    assert.equal(juiz.pedidos.length, 2);
    assert.equal(juiz.pedidos[0].percentual_procedente, 75);
  });

  await t.test('ordena os juízes por quantidade de pedidos julgados', () => {
    const lista = agruparPorJuiz([
      linha(1, 'Ana', 10, 'Horas extras', [1, 0, 0, 0]),
      linha(2, 'Bruno', 10, 'Horas extras', [2, 2, 0, 0]),
    ]);
    assert.deepEqual(lista.map((j) => j.nome_juiz), ['Bruno', 'Ana']);
  });

  await t.test('sem linhas, devolve lista vazia', () => {
    assert.deepEqual(agruparPorJuiz([]), []);
  });
});

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

test('jurimetria.service - agruparPorDesembargador', async (t) => {
  const linha = (id, nome, pedido, v) => ({
    id_desembargador: id, nome_desembargador: nome, id_pedido: pedido, nome_pedido: `P${pedido}`,
    total: 0, procedentes: 0, improcedentes: 0, parciais: 0, sem_resultado: 0, reformados: 0, ...v,
  });

  await t.test('soma reformados por desembargador e por pedido', () => {
    const [d] = agruparPorDesembargador([
      linha(1, 'Ana', 1, { total: 4, procedentes: 3, improcedentes: 1, reformados: 2 }),
      linha(1, 'Ana', 2, { total: 2, improcedentes: 2, reformados: 1 }),
    ]);
    assert.equal(d.total, 6);
    assert.equal(d.reformados, 3);
    assert.equal(d.pedidos[0].reformados, 2);
    assert.equal(d.percentual_procedente, 50);
  });
});

test('jurimetria.service - chancesDoJulgador', async (t) => {
  await t.test('percentuais consideram só pedidos com resultado e apontam a tendência', () => {
    const c = chancesDoJulgador({ procedentes: 3, improcedentes: 7, parciais: 0 });
    assert.equal(c.decididos, 10);
    assert.equal(c.chance_improcedente, 70);
    assert.equal(c.chance_procedente, 30);
    assert.equal(c.tendencia, 'improcedente');
    assert.equal(c.amostra_pequena, false);
  });

  await t.test('amostra pequena e sem tendência em caso de empate ou ausência de dados', () => {
    assert.equal(chancesDoJulgador({ procedentes: 1, improcedentes: 1, parciais: 0 }).tendencia, null);
    assert.equal(chancesDoJulgador({ procedentes: 1, improcedentes: 1, parciais: 0 }).amostra_pequena, true);
    const vazio = chancesDoJulgador({ procedentes: 0, improcedentes: 0, parciais: 0 });
    assert.equal(vazio.decididos, 0);
    assert.equal(vazio.tendencia, null);
  });

  await t.test('agruparPorJuiz ignora "sem resultado" nas chances e anexa fundamentos', () => {
    const fundamentos = new Map([['1:10', [{ resultado: 'improcedente', texto: 'Sem prova do dano.' }]]]);
    const [j] = agruparPorJuiz(
      [{ id_juiz: 1, nome_juiz: 'Renata', id_pedido: 10, nome_pedido: 'Danos morais', total: 6, procedentes: 0, improcedentes: 2, parciais: 0, sem_resultado: 4 }],
      fundamentos
    );
    assert.equal(j.percentual_sem_resultado, 66.7);
    assert.equal(j.chance_improcedente, 100);
    assert.equal(j.pedidos[0].fundamentos[0].texto, 'Sem prova do dano.');
  });
});
