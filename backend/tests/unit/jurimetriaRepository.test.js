// Testa a FORMA do SQL gerado por jurimetria.repository.js, sem precisar
// de um Postgres real: substitui o pool (config/db.js) por um fake que
// grava cada `query(sql, params)` recebida, e verificamos que os filtros
// viram cláusulas parametrizadas ($1, $2...) - nunca concatenação direta
// de valor no texto da query (proteção contra SQL injection).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { mockModule, clearCache } = require('../helpers/mockRequire');

const dbPath = require.resolve(path.resolve(__dirname, '../../src/config/db.js'));
const repoPath = require.resolve(path.resolve(__dirname, '../../src/repositories/jurimetria.repository.js'));

function withMockedPool(queryImpl) {
  const calls = [];
  const fakePool = {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      return queryImpl(sql, params);
    },
  };
  const restoreDb = mockModule(dbPath, fakePool);
  clearCache(repoPath);
  const repo = require(repoPath);
  return {
    repo,
    calls,
    restore: () => {
      restoreDb();
      clearCache(repoPath);
    },
  };
}

test('jurimetria.repository - construção de SQL parametrizado', async (t) => {
  await t.test('getPorPedido sem filtros gera WHERE vazio e nenhum parâmetro', async () => {
    const { repo, calls, restore } = withMockedPool(async () => ({ rows: [] }));
    try {
      await repo.getPorPedido({});
      assert.equal(calls.length, 1);
      // Note: a query legitimamente contém a palavra "WHERE" dentro de
      // COUNT(*) FILTER (WHERE pp.resultado = 'procedente') - isso não é
      // o WHERE opcional de filtros que buildProcessoWhere adicionaria
      // (que sempre referencia a coluna via alias "p.", ex: "WHERE p.id_tribunal").
      assert.equal(calls[0].sql.includes('WHERE p.'), false);
      assert.deepEqual(calls[0].params, []);
    } finally {
      restore();
    }
  });

  await t.test('filtro de tribunal vira cláusula parametrizada, nunca valor concatenado', async () => {
    const { repo, calls, restore } = withMockedPool(async () => ({ rows: [] }));
    try {
      await repo.getPorPedido({ id_tribunal: 5 });
      assert.equal(calls[0].sql.includes('p.id_tribunal = $1'), true);
      assert.deepEqual(calls[0].params, [5]);
      assert.equal(calls[0].sql.includes('= 5'), false);
    } finally {
      restore();
    }
  });

  await t.test('combina múltiplos filtros mantendo a ordem dos parâmetros posicionais', async () => {
    const { repo, calls, restore } = withMockedPool(async () => ({ rows: [] }));
    try {
      await repo.getPorPedido({ id_tribunal: 5, id_comarca: 9, data_inicio: '2024-01-01' });
      assert.deepEqual(calls[0].params, [5, 9, '2024-01-01']);
      assert.equal(calls[0].sql.includes('p.id_tribunal = $1'), true);
      assert.equal(calls[0].sql.includes('p.id_comarca = $2'), true);
      assert.equal(calls[0].sql.includes('p.data_distribuicao >= $3'), true);
    } finally {
      restore();
    }
  });

  await t.test('getPorJulgador aplica o filtro de pedido só na condição do JOIN, não no WHERE', async () => {
    const { repo, calls, restore } = withMockedPool(async () => ({ rows: [] }));
    try {
      await repo.getPorJulgador({ id_pedido: 7 });
      assert.equal(calls.length, 2); // juiz + desembargador
      for (const call of calls) {
        assert.equal(call.sql.includes('AND pp.id_pedido = $1'), true);
      }
    } finally {
      restore();
    }
  });

  await t.test('getResumo dispara as 6 queries agregadas e monta o objeto bruto esperado', async () => {
    const { repo, calls, restore } = withMockedPool(async (sql) => {
      if (sql.includes('AS total_processos')) {
        return { rows: [{ total_processos: 3, valor_total_causas: '1500.00' }] };
      }
      if (sql.includes('FROM situacao_processo')) {
        return { rows: [{ id_situacao: 1, nome_situacao: 'Em andamento', total: 2 }] };
      }
      if (sql.includes('FROM analise_decisao')) {
        return { rows: [{ status: 'Concluída', total: 1 }] };
      }
      if (sql.includes('FROM processo_pedidos pp') && sql.includes('total_vinculados')) {
        return { rows: [{ total_vinculados: 4, total_analisados: 3, procedentes: 2, improcedentes: 1, parciais: 0 }] };
      }
      if (sql.includes('FROM acordao a')) {
        return { rows: [{ reformadas: 1, mantidas: 1, nao_informado: 0, total_acordaos: 2 }] };
      }
      if (sql.includes("date_trunc('month'")) {
        return { rows: [] };
      }
      throw new Error(`Query inesperada no teste: ${sql.slice(0, 60)}...`);
    });
    try {
      const resultado = await repo.getResumo({});
      assert.equal(calls.length, 6);
      assert.equal(resultado.totalProcessos.total_processos, 3);
      assert.equal(resultado.porSituacao[0].nome_situacao, 'Em andamento');
      assert.equal(resultado.analises[0].status, 'Concluída');
      assert.equal(resultado.pedidos.total_vinculados, 4);
      assert.equal(resultado.reformas.reformadas, 1);
      assert.deepEqual(resultado.porPeriodo, []);
    } finally {
      restore();
    }
  });
});
