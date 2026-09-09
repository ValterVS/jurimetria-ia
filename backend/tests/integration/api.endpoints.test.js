// Sobe o app Express REAL (mesmo app.js usado em produção) num servidor
// HTTP efêmero, com o pool do Postgres (config/db.js) substituído por um
// fake controlado pelo teste - sem precisar de um banco de dados de
// verdade. Cobre: health check tolerante a banco fora do ar, um cadastro
// auxiliar (tribunais) ponta a ponta, validação 400, 404 e paginação de
// processos.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');
const { mockModule, clearCache } = require('../helpers/mockRequire');

const dbPath = require.resolve(path.resolve(__dirname, '../../src/config/db.js'));
const appPath = require.resolve(path.resolve(__dirname, '../../src/app.js'));

let currentQueryImpl = async () => ({ rows: [], rowCount: 0 });

const fakePool = {
  query: async (sql, params) => currentQueryImpl(sql, params),
};

const restoreDb = mockModule(dbPath, fakePool);
clearCache(appPath);
const app = require(appPath);

test.after(() => {
  restoreDb();
  clearCache(appPath);
});

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function request(server, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: data
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = chunks ? JSON.parse(chunks) : null;
          } catch {
            parsedBody = chunks;
          }
          resolve({ status: res.statusCode, body: parsedBody });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('GET /api/health', async (t) => {
  await t.test('responde 200 e database:"connected" quando o banco responde', async () => {
    currentQueryImpl = async (sql) => {
      assert.equal(sql, 'SELECT 1');
      return { rows: [{ '?column?': 1 }] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'GET', '/api/health');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.equal(body.database, 'connected');
    } finally {
      await stopServer(server);
    }
  });

  await t.test('nunca falha por causa do banco - responde 200 com database:"unavailable"', async () => {
    currentQueryImpl = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'GET', '/api/health');
      assert.equal(status, 200);
      assert.equal(body.database, 'unavailable');
    } finally {
      await stopServer(server);
    }
  });
});

test('GET /api/tribunais e POST /api/tribunais', async (t) => {
  await t.test('lista tribunais cadastrados', async () => {
    currentQueryImpl = async (sql) => {
      assert.equal(sql.includes('FROM tribunal'), true);
      return { rows: [{ id_tribunal: 1, nome_tribunal: 'TJSP' }] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'GET', '/api/tribunais');
      assert.equal(status, 200);
      assert.deepEqual(body, [{ id_tribunal: 1, nome_tribunal: 'TJSP' }]);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('rejeita criação sem nome_tribunal com 400, sem chegar a consultar o banco', async () => {
    currentQueryImpl = async () => {
      throw new Error('pool.query não deveria ter sido chamado para um payload inválido');
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'POST', '/api/tribunais', {});
      assert.equal(status, 400);
      assert.ok(body.error);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('cria um tribunal com payload válido', async () => {
    currentQueryImpl = async (sql, params) => {
      assert.equal(sql.includes('INSERT INTO tribunal'), true);
      assert.deepEqual(params, ['Tribunal Novo']);
      return { rows: [{ id_tribunal: 2, nome_tribunal: 'Tribunal Novo' }] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'POST', '/api/tribunais', { nome_tribunal: 'Tribunal Novo' });
      assert.equal(status, 201);
      assert.deepEqual(body, { id_tribunal: 2, nome_tribunal: 'Tribunal Novo' });
    } finally {
      await stopServer(server);
    }
  });
});

test('GET /api/processos', async (t) => {
  await t.test('retorna 404 amigável para processo inexistente', async () => {
    currentQueryImpl = async (sql) => {
      assert.equal(sql.includes('WHERE p.id_processo = $1'), true);
      return { rows: [] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'GET', '/api/processos/999');
      assert.equal(status, 404);
      assert.equal(body.error, 'Processo não encontrado.');
    } finally {
      await stopServer(server);
    }
  });

  await t.test('lista processos paginados com items/total/limit/offset', async () => {
    currentQueryImpl = async (sql) => {
      if (sql.includes('LIMIT')) {
        return { rows: [{ id_processo: 1, numero_processo: '0001234-56.2024.8.26.0100' }] };
      }
      if (sql.includes('COUNT(*)::int AS total')) {
        return { rows: [{ total: 1 }] };
      }
      throw new Error(`Query inesperada: ${sql}`);
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'GET', '/api/processos?limit=20&offset=0');
      assert.equal(status, 200);
      assert.equal(body.total, 1);
      assert.equal(body.items.length, 1);
      assert.equal(body.limit, 20);
      assert.equal(body.offset, 0);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('numero_processo do filtro vira ILIKE parametrizado com %...%', async () => {
    currentQueryImpl = async (sql, params) => {
      if (sql.includes('LIMIT')) {
        assert.equal(sql.includes('p.numero_processo ILIKE'), true);
        assert.equal(params[0], '%1234%');
        return { rows: [] };
      }
      return { rows: [{ total: 0 }] };
    };
    const server = await startServer();
    try {
      const { status } = await request(server, 'GET', '/api/processos?numero_processo=1234');
      assert.equal(status, 200);
    } finally {
      await stopServer(server);
    }
  });
});

test('rota inexistente retorna 404 padronizado', async (t) => {
  await t.test('GET /api/rota-que-nao-existe', async () => {
    currentQueryImpl = async () => ({ rows: [] });
    const server = await startServer();
    try {
      const { status } = await request(server, 'GET', '/api/rota-que-nao-existe');
      assert.equal(status, 404);
    } finally {
      await stopServer(server);
    }
  });
});
