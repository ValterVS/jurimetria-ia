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

process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';

const dbPath = require.resolve(path.resolve(__dirname, '../../src/config/db.js'));
const appPath = require.resolve(path.resolve(__dirname, '../../src/app.js'));
const { gerarToken } = require(path.resolve(__dirname, '../../src/utils/jwt.js'));

// token válido de uma empresa fictícia, usado em toda rota protegida - as
// rotas de dados exigem autenticação desde a Fase de multiempresa.
const TOKEN_TESTE = gerarToken({ id_empresa: 1, email: 'teste@empresa.com', nome_empresa: 'Empresa Teste' });
const AUTH_HEADER = { Authorization: `Bearer ${TOKEN_TESTE}` };

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

function request(server, method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...extraHeaders,
        },
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

test('autenticação obrigatória fora de /api/auth e /api/health', async (t) => {
  await t.test('rota protegida sem token retorna 401', async () => {
    currentQueryImpl = async () => ({ rows: [] });
    const server = await startServer();
    try {
      const { status } = await request(server, 'GET', '/api/tribunais');
      assert.equal(status, 401);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('rota protegida com token inválido retorna 401', async () => {
    currentQueryImpl = async () => ({ rows: [] });
    const server = await startServer();
    try {
      const { status } = await request(server, 'GET', '/api/tribunais', undefined, {
        Authorization: 'Bearer token-invalido',
      });
      assert.equal(status, 401);
    } finally {
      await stopServer(server);
    }
  });
});

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
      const { status, body } = await request(server, 'GET', '/api/tribunais', undefined, AUTH_HEADER);
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
      const { status, body } = await request(server, 'POST', '/api/tribunais', {}, AUTH_HEADER);
      assert.equal(status, 400);
      assert.ok(body.error);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('cria um tribunal com payload válido', async () => {
    currentQueryImpl = async (sql, params) => {
      // antes de inserir, o service consulta os existentes para detectar duplicatas
      if (sql.includes('SELECT')) return { rows: [{ id_tribunal: 1, nome_tribunal: 'TJSP' }] };
      assert.equal(sql.includes('INSERT INTO tribunal'), true);
      assert.deepEqual(params, ['Tribunal Novo']);
      return { rows: [{ id_tribunal: 2, nome_tribunal: 'Tribunal Novo' }] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(server, 'POST', '/api/tribunais', { nome_tribunal: 'Tribunal Novo' }, AUTH_HEADER);
      assert.equal(status, 201);
      assert.deepEqual(body, { id_tribunal: 2, nome_tribunal: 'Tribunal Novo' });
    } finally {
      await stopServer(server);
    }
  });
});

test('cadastro de tribunal ignora maiúscula/acento e evita duplicata', async (t) => {
  await t.test('POST com nome já existente (outra caixa) retorna 409', async () => {
    currentQueryImpl = async (sql) => {
      if (sql.includes('SELECT')) return { rows: [{ id_tribunal: 1, nome_tribunal: 'Tribunal de Justiça de São Paulo' }] };
      throw new Error('não deveria inserir uma duplicata');
    };
    const server = await startServer();
    try {
      const { status } = await request(
        server, 'POST', '/api/tribunais', { nome_tribunal: 'tribunal de justica de sao paulo' }, AUTH_HEADER
      );
      assert.equal(status, 409);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('obter-ou-criar devolve o existente (200) sem inserir', async () => {
    currentQueryImpl = async (sql) => {
      if (sql.includes('SELECT')) return { rows: [{ id_tribunal: 1, nome_tribunal: 'Tribunal de Justiça de São Paulo' }] };
      throw new Error('não deveria inserir uma duplicata');
    };
    const server = await startServer();
    try {
      const { status, body } = await request(
        server, 'POST', '/api/tribunais/obter-ou-criar', { nome_tribunal: 'TRIBUNAL DE JUSTIÇA DE SÃO PAULO' }, AUTH_HEADER
      );
      assert.equal(status, 200);
      assert.equal(body.id_tribunal, 1);
    } finally {
      await stopServer(server);
    }
  });

  await t.test('obter-ou-criar cria (201) com nome padronizado quando não existe', async () => {
    currentQueryImpl = async (sql, params) => {
      if (sql.includes('SELECT')) return { rows: [] };
      assert.deepEqual(params, ['Tribunal de Teste']);
      return { rows: [{ id_tribunal: 9, nome_tribunal: 'Tribunal de Teste' }] };
    };
    const server = await startServer();
    try {
      const { status, body } = await request(
        server, 'POST', '/api/tribunais/obter-ou-criar', { nome_tribunal: 'tribunal de teste' }, AUTH_HEADER
      );
      assert.equal(status, 201);
      assert.equal(body.nome_tribunal, 'Tribunal de Teste');
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
      const { status, body } = await request(server, 'GET', '/api/processos/999', undefined, AUTH_HEADER);
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
      const { status, body } = await request(server, 'GET', '/api/processos?limit=20&offset=0', undefined, AUTH_HEADER);
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
        // não fixamos a posição do parâmetro: a query agora também filtra
        // por id_empresa (empresa logada), o que desloca os índices.
        assert.equal(params.includes('%1234%'), true);
        return { rows: [] };
      }
      return { rows: [{ total: 0 }] };
    };
    const server = await startServer();
    try {
      const { status } = await request(server, 'GET', '/api/processos?numero_processo=1234', undefined, AUTH_HEADER);
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
      const { status } = await request(server, 'GET', '/api/rota-que-nao-existe', undefined, AUTH_HEADER);
      assert.equal(status, 404);
    } finally {
      await stopServer(server);
    }
  });
});
