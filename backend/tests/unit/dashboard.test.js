const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { mockModule, clearCache } = require('../helpers/mockRequire');

const dbPath = require.resolve(path.resolve(__dirname, '../../src/config/db.js'));
const repoPath = require.resolve(path.resolve(__dirname, '../../src/repositories/dashboard.repository.js'));
const servicePath = require.resolve(path.resolve(__dirname, '../../src/services/dashboard.service.js'));

function setup(queryImpl) {
  const calls = [];
  const restoreDb = mockModule(dbPath, {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      return queryImpl(sql, params);
    },
  });
  clearCache(repoPath, servicePath);
  return {
    calls,
    repo: require(repoPath),
    service: require(servicePath),
    restore: () => {
      restoreDb();
      clearCache(repoPath, servicePath);
    },
  };
}

test('dashboard.repository - todas as consultas filtram pela empresa, por parâmetro', async () => {
  const { repo, calls, restore } = setup(async () => ({ rows: [{}] }));
  try {
    await repo.getTotais(7);
    await repo.getPorCategoria(7);
    await repo.getPorSituacao(7);
    await repo.getTopPedidos(7, 10);
    await repo.getCondenacao(7);
    assert.equal(calls.length, 5);
    for (const c of calls) {
      assert.equal(c.params[0], 7);
      assert.equal(c.sql.includes('id_empresa = $1'), true);
    }
    assert.deepEqual(calls[3].params, [7, 10]);
  } finally {
    restore();
  }
});

test('dashboard.service - monta o panorama convertendo numerics para número', async () => {
  const { service, restore } = setup(async (sql) => {
    if (sql.includes('AS valor_total_causas')) return { rows: [{ total_processos: 4, valor_total_causas: '100000.50' }] };
    if (sql.includes('FROM situacao_processo')) return { rows: [{ id_situacao: 1, nome_situacao: 'Em andamento', total: 3 }] };
    if (sql.includes('GROUP BY 1')) return { rows: [{ categoria: 'Trabalhista', total: 4 }] };
    if (sql.includes('FROM processo_pedidos')) return { rows: [{ id_pedido: 1, nome_pedido: 'Horas extras', total_processos: 3 }] };
    if (sql.includes('WITH ultima')) {
      return { rows: [{ processos_no_calculo: 2, valor_total_condenacao: '30000', valor_total_beneficio: '45000.25' }] };
    }
    throw new Error('query inesperada');
  });
  try {
    const d = await service.getDashboard(7);
    assert.equal(d.total_processos, 4);
    assert.equal(d.valor_total_causas, 100000.5);
    assert.equal(d.valor_total_condenacao, 30000);
    assert.equal(d.valor_total_beneficio, 45000.25);
    assert.equal(d.processos_no_calculo, 2);
    assert.equal(d.processos_por_categoria[0].categoria, 'Trabalhista');
    assert.equal(d.top_pedidos[0].total_processos, 3);
  } finally {
    restore();
  }
});
