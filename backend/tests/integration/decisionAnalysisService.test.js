// Testa o orquestrador central da análise por IA (decisionAnalysisService)
// com TODOS os repositórios e o AIProvider mockados via injeção no cache
// de módulos do Node - nenhuma chamada real a Postgres nem à API da
// Anthropic acontece aqui (requisito explícito do escopo: nunca gastar
// crédito real da Anthropic em testes).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { mockModule, clearCache } = require('../helpers/mockRequire');
const { validAnalysisPayload } = require('../helpers/fixtures');

const paths = {
  analiseDecisao: require.resolve(path.resolve(__dirname, '../../src/repositories/analiseDecisao.repository.js')),
  sentenca: require.resolve(path.resolve(__dirname, '../../src/repositories/sentenca.repository.js')),
  acordao: require.resolve(path.resolve(__dirname, '../../src/repositories/acordao.repository.js')),
  processoPedido: require.resolve(path.resolve(__dirname, '../../src/repositories/processoPedido.repository.js')),
  cadastros: require.resolve(path.resolve(__dirname, '../../src/repositories/cadastros.repository.js')),
  autofill: require.resolve(path.resolve(__dirname, '../../src/ai/acordaoAutofill.js')),
  pedido: require.resolve(path.resolve(__dirname, '../../src/repositories/pedido.repository.js')),
  aiProvider: require.resolve(path.resolve(__dirname, '../../src/ai/aiProvider.js')),
  service: require.resolve(path.resolve(__dirname, '../../src/ai/decisionAnalysisService.js')),
};

// Monta um "banco de dados" em memória e os módulos fake que decisionAnalysisService
// espera, retornando { service, state, restore }. `state` fica acessível
// para os testes inspecionarem o que foi persistido.
function setupHarness({ analyzeDecisionImpl }) {
  const state = {
    analises: new Map(),
    sentencas: new Map(),
    acordaos: new Map(),
    pedidosVinculados: new Map(),
    pedidosCatalogo: [
      { id_pedido: 1, nome_pedido: 'Horas extras' },
      { id_pedido: 2, nome_pedido: 'Danos morais' },
      { id_pedido: 100, nome_pedido: 'Horas extras' },
      { id_pedido: 200, nome_pedido: 'Danos morais' },
    ],
    catalogos: {
      tribunal: [{ id_tribunal: 1, nome_tribunal: 'Tribunal Regional do Trabalho da 15ª Região' }],
      desembargador: [{ id_desembargador: 33, nome_desembargador: 'Maria Souza', id_tribunal: 1 }],
      tipoAcordao: [{ id_tipo_acordao: 1, tipo_acordao: 'Provido' }],
    },
    nextCatalogoId: 700,
    nextAnaliseId: 1,
    nextVinculoId: 1000,
    nextPedidoId: 5000,
  };

  // Importante: cada método retorna uma CÓPIA (`{ ...row }`), nunca a
  // referência mutável guardada no Map. Isso espelha o comportamento real
  // do Postgres (cada SELECT/UPDATE...RETURNING entrega um snapshot novo),
  // e evita que um `analise` capturado antes de um `updateStatus`
  // posterior "mude sozinho" só porque os testes seguram a mesma
  // referência de objeto em memória.
  const fakeAnaliseDecisaoRepo = {
    findById: async (id) => {
      const row = state.analises.get(id);
      return row ? { ...row } : null;
    },
    create: async () => {
      const id = state.nextAnaliseId++;
      const row = {
        id_analise: id,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      };
      state.analises.set(id, row);
      return { ...row };
    },
    updateStatus: async (id, statusLabel) => {
      const row = state.analises.get(id);
      row.status = statusLabel;
      return { ...row };
    },
    markConcluida: async (id, { insightsJson, inputTokens, outputTokens, plataforma }) => {
      const row = state.analises.get(id);
      row.status = 'Concluída';
      row.insights_json = insightsJson;
      row.input_tokens = inputTokens;
      row.output_tokens = outputTokens;
      row.plataforma_utilizada = plataforma;
      row.erro_log = null;
      return { ...row };
    },
    markErro: async (id, erroLog) => {
      const row = state.analises.get(id);
      row.status = 'Erro';
      row.erro_log = erroLog;
      return { ...row };
    },
  };

  const fakeSentencaRepo = {
    findById: async (id) => {
      const row = state.sentencas.get(id);
      return row ? { ...row } : null;
    },
    linkAnalise: async (id, idAnalise) => {
      const row = state.sentencas.get(id);
      row.id_analise = idAnalise;
      return { ...row };
    },
  };

  const fakeAcordaoRepo = {
    findById: async (id) => {
      const row = state.acordaos.get(id);
      return row ? { ...row } : null;
    },
    linkAnalise: async (id, idAnalise) => {
      const row = state.acordaos.get(id);
      row.id_analise = idAnalise;
      return { ...row };
    },
    updateReformaSentenca: async (id, valor) => {
      const row = state.acordaos.get(id);
      row.reforma_sentenca = valor;
      return { ...row };
    },
    // COALESCE: só preenche colunas vazias
    preencherCamposVazios: async (id, campos) => {
      const row = state.acordaos.get(id);
      for (const [col, val] of Object.entries(campos)) {
        if (val !== null && val !== undefined && (row[col] === null || row[col] === undefined)) row[col] = val;
      }
      return { ...row };
    },
  };

  const fakeCatalogo = (lista, idColumn, nameColumn, parentColumn = null) => ({
    idColumn,
    nameColumn,
    parentColumn,
    findAll: async ({ parentId } = {}) =>
      lista.filter((i) => !(parentColumn && parentId) || i[parentColumn] === parentId).map((i) => ({ ...i })),
    create: async (dados) => {
      const novo = { [idColumn]: state.nextCatalogoId++, ...dados };
      lista.push(novo);
      return { ...novo };
    },
  });

  const fakeCadastrosRepo = {
    tribunalRepository: fakeCatalogo(state.catalogos.tribunal, 'id_tribunal', 'nome_tribunal'),
    desembargadorRepository: fakeCatalogo(state.catalogos.desembargador, 'id_desembargador', 'nome_desembargador', 'id_tribunal'),
    tipoAcordaoRepository: fakeCatalogo(state.catalogos.tipoAcordao, 'id_tipo_acordao', 'tipo_acordao'),
  };

  const achar = (idVinculo) => {
    for (const lista of state.pedidosVinculados.values()) {
      const item = lista.find((p) => p.id_processo_pedido === idVinculo);
      if (item) return item;
    }
    return null;
  };

  // espelha a lógica SQL de processoPedido.repository.js
  const fakeProcessoPedidoRepo = {
    findByProcesso: async (idProcesso) => (state.pedidosVinculados.get(idProcesso) || []).map((p) => ({ ...p })),
    create: async (idProcesso, { id_pedido, descricao = null }) => {
      const lista = state.pedidosVinculados.get(idProcesso) || [];
      const catalogo = state.pedidosCatalogo.find((c) => c.id_pedido === id_pedido);
      const item = {
        id_processo_pedido: state.nextVinculoId++,
        id_pedido,
        nome_pedido: catalogo.nome_pedido,
        descricao,
        valor: null,
        resultado: null,
        id_juiz: null,
        resultado_sentenca: null,
        id_desembargador: null,
        resultado_acordao: null,
        reformado: null,
      };
      lista.push(item);
      state.pedidosVinculados.set(idProcesso, lista);
      return { ...item };
    },
    registrarSentenca: async (idVinculo, { valor, resultado, id_juiz, descricao, fundamentacao }) => {
      const p = achar(idVinculo);
      p.fundamentacao_sentenca = fundamentacao ?? p.fundamentacao_sentenca ?? null;
      p.valor = valor ?? p.valor;
      p.resultado_sentenca = resultado ?? null;
      p.id_juiz = id_juiz ?? null;
      p.descricao = p.descricao ?? descricao ?? null;
      if (p.resultado_acordao == null) p.resultado = resultado ?? null;
      else if (resultado != null) p.reformado = p.resultado_acordao !== resultado;
    },
    registrarAcordao: async (idVinculo, { valor, resultado, id_desembargador, descricao }) => {
      const p = achar(idVinculo);
      p.valor = valor ?? p.valor;
      p.resultado_acordao = resultado ?? null;
      p.id_desembargador = id_desembargador ?? null;
      p.descricao = p.descricao ?? descricao ?? null;
      p.resultado = resultado ?? p.resultado;
      if (resultado != null && p.resultado_sentenca != null) p.reformado = resultado !== p.resultado_sentenca;
    },
    definirJuizNosPedidos: async (idVinculos, idJuiz) => {
      for (const id of idVinculos) achar(id).id_juiz = idJuiz;
    },
  };

  const fakePedidoRepo = {
    findAll: async () => state.pedidosCatalogo.map((c) => ({ ...c })),
    create: async ({ nome_pedido }) => {
      const criado = { id_pedido: state.nextPedidoId++, nome_pedido };
      state.pedidosCatalogo.push(criado);
      return { ...criado };
    },
  };

  const fakeAiProviderModule = {
    getAIProvider: () => ({ analyzeDecision: analyzeDecisionImpl }),
  };

  const restores = [
    mockModule(paths.analiseDecisao, fakeAnaliseDecisaoRepo),
    mockModule(paths.sentenca, fakeSentencaRepo),
    mockModule(paths.acordao, fakeAcordaoRepo),
    mockModule(paths.processoPedido, fakeProcessoPedidoRepo),
    mockModule(paths.pedido, fakePedidoRepo),
    mockModule(paths.cadastros, fakeCadastrosRepo),
    mockModule(paths.aiProvider, fakeAiProviderModule),
  ];
  clearCache(paths.service, paths.autofill);
  const service = require(paths.service);

  return {
    service,
    state,
    restore: () => {
      restores.forEach((r) => r());
      clearCache(paths.service, paths.autofill);
    },
  };
}

function vinculo(id, idPedido, nome, extra = {}) {
  return {
    id_processo_pedido: id,
    id_pedido: idPedido,
    nome_pedido: nome,
    descricao: null,
    valor: null,
    resultado: null,
    id_juiz: null,
    resultado_sentenca: null,
    id_desembargador: null,
    resultado_acordao: null,
    reformado: null,
    ...extra,
  };
}

function pedidoIA(nome, resultado, extra = {}) {
  return {
    nome,
    descricao: null,
    resultado,
    valor_identificado: null,
    fundamentacao_resumida: null,
    trecho_relevante: null,
    ...extra,
  };
}

function novaAnalise(id) {
  return { id_analise: id, status: 'Pendente' };
}

test('decisionAnalysisService.processAnalysis', async (t) => {
  await t.test('fluxo de sucesso: Pendente -> Concluída, sem perder dado', async () => {
    let analyzeDecisionCalled = false;
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async ({ texto, tipoDocumentoSugerido }) => {
        analyzeDecisionCalled = true;
        assert.equal(tipoDocumentoSugerido, 'sentenca');
        // O texto recebido pelo "provider" já deve estar anonimizado -
        // nunca deve conter o CPF original.
        assert.equal(texto.includes('123.456.789-01'), false);
        return {
          data: validAnalysisPayload({
            pedidos: [
              {
                nome: 'Horas Extras', // maiúsculas diferentes de propósito
                resultado: 'procedente',
                valor_identificado: 500,
                fundamentacao_resumida: 'Comprovado.',
                trecho_relevante: 'trecho',
              },
            ],
          }),
          model: 'gpt-5.6-terra',
          inputTokens: 120,
          outputTokens: 340,
        };
      },
    });

    try {
      state.sentencas.set(1, { id_sentenca: 1, id_processo: 10, id_analise: null });
      state.pedidosVinculados.set(10, [vinculo(1, 100, 'Horas extras')]);
      state.analises.set(5, {
        id_analise: 5,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      });
      state.nextAnaliseId = 6;

      await service.processAnalysis({
        tipoDecisao: 'sentenca',
        idDecisao: 1,
        idProcesso: 10,
        idAnalise: 5,
        texto: 'O requerente, CPF 123.456.789-01, pleiteia horas extras.',
        arquivo: undefined,
      });

      assert.equal(analyzeDecisionCalled, true);

      const analise = state.analises.get(5);
      assert.equal(analise.status, 'Concluída');
      assert.equal(analise.erro_log, null);
      assert.equal(analise.plataforma_utilizada, 'gpt-5.6-terra');
      assert.equal(analise.input_tokens, 120);
      assert.equal(analise.output_tokens, 340);
      assert.ok(analise.insights_json);

      // Pedido casado por nome (case-insensitive) e atualizado com o
      // resultado retornado pela IA.
      const pedido = state.pedidosVinculados.get(10)[0];
      assert.equal(pedido.resultado, 'procedente');
      assert.equal(pedido.valor, 500);
    } finally {
      restore();
    }
  });

  await t.test('falha na IA marca Erro e preserva a análise (nunca perde dado)', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => {
        const err = new Error('Falha na comunicação com a Anthropic: timeout');
        err.status = 502;
        throw err;
      },
    });

    try {
      state.sentencas.set(2, { id_sentenca: 2, id_processo: 20, id_analise: null });
      state.analises.set(9, {
        id_analise: 9,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      });

      await service.processAnalysis({
        tipoDecisao: 'sentenca',
        idDecisao: 2,
        idProcesso: 20,
        idAnalise: 9,
        texto: 'Texto qualquer da sentença.',
        arquivo: undefined,
      });

      const analise = state.analises.get(9);
      assert.equal(analise.status, 'Erro');
      assert.ok(analise.erro_log.includes('Falha na comunicação com a Anthropic'));
      // A sentença continua vinculada e nada foi apagado.
      assert.equal(state.sentencas.get(2).id_processo, 20);
    } finally {
      restore();
    }
  });

  await t.test('texto vazio e sem arquivo marca Erro (documento vazio), sem chamar a IA', async () => {
    let chamouIA = false;
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => {
        chamouIA = true;
        return { data: validAnalysisPayload(), model: 'x', inputTokens: 1, outputTokens: 1 };
      },
    });

    try {
      state.analises.set(3, {
        id_analise: 3,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      });

      await service.processAnalysis({
        tipoDecisao: 'sentenca',
        idDecisao: 1,
        idProcesso: 10,
        idAnalise: 3,
        texto: '   ',
        arquivo: undefined,
      });

      assert.equal(chamouIA, false);
      assert.equal(state.analises.get(3).status, 'Erro');
    } finally {
      restore();
    }
  });

  await t.test('acórdão: preenche reforma_sentenca via IA só quando ainda não informado manualmente', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({
          tipo_documento: 'acordao',
          pedidos: [],
          acordao: { reforma_sentenca: true },
        }),
        model: 'gpt-5.6-terra',
        inputTokens: 10,
        outputTokens: 10,
      }),
    });

    try {
      state.acordaos.set(7, { id_acordao: 7, id_processo: 30, id_analise: null, reforma_sentenca: null });
      state.analises.set(4, {
        id_analise: 4,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      });

      await service.processAnalysis({
        tipoDecisao: 'acordao',
        idDecisao: 7,
        idProcesso: 30,
        idAnalise: 4,
        texto: 'Texto do acórdão.',
        arquivo: undefined,
      });

      assert.equal(state.acordaos.get(7).reforma_sentenca, true);
    } finally {
      restore();
    }
  });

  await t.test('acórdão: NUNCA sobrescreve reforma_sentenca já definida manualmente pelo usuário', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({
          tipo_documento: 'acordao',
          pedidos: [],
          acordao: { reforma_sentenca: true },
        }),
        model: 'gpt-5.6-terra',
        inputTokens: 10,
        outputTokens: 10,
      }),
    });

    try {
      // Usuário já havia marcado manualmente reforma_sentenca = false ao
      // cadastrar o acórdão (Fase 5) - a IA não pode sobrescrever isso.
      state.acordaos.set(8, { id_acordao: 8, id_processo: 31, id_analise: null, reforma_sentenca: false });
      state.analises.set(6, {
        id_analise: 6,
        status: 'Pendente',
        plataforma_utilizada: null,
        input_tokens: null,
        output_tokens: null,
        insights_json: null,
        data_processamento: null,
        erro_log: null,
      });

      await service.processAnalysis({
        tipoDecisao: 'acordao',
        idDecisao: 8,
        idProcesso: 31,
        idAnalise: 6,
        texto: 'Texto do acórdão.',
        arquivo: undefined,
      });

      assert.equal(state.acordaos.get(8).reforma_sentenca, false);
    } finally {
      restore();
    }
  });

  async function rodar({ tipoDecisao, idDecisao, idProcesso, pedidos, setup }) {
    const h = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({ tipo_documento: tipoDecisao, pedidos }),
        model: 'x',
        inputTokens: 1,
        outputTokens: 1,
      }),
    });
    try {
      setup(h.state);
      h.state.analises.set(900, novaAnalise(900));
      await h.service.processAnalysis({
        tipoDecisao, idDecisao, idProcesso, idAnalise: 900, texto: 'Texto.', arquivo: undefined,
      });
      return { state: h.state, lista: h.state.pedidosVinculados.get(idProcesso), restore: h.restore };
    } catch (e) {
      h.restore();
      throw e;
    }
  }

  await t.test('pedido encontrado pela IA e ainda não cadastrado é criado já com o resultado', async () => {
    const { lista, state, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 3, idProcesso: 40,
      pedidos: [pedidoIA('Adicional noturno', 'procedente', { valor_identificado: 800 })],
      setup: (s) => {
        s.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_juiz: 77, id_analise: null });
        s.pedidosVinculados.set(40, [vinculo(1, 200, 'Danos morais')]);
      },
    });
    try {
      assert.equal(state.analises.get(900).status, 'Concluída');
      assert.equal(lista.length, 2);
      const novo = lista.find((p) => p.nome_pedido === 'Adicional Noturno');
      assert.equal(novo.resultado, 'procedente');
      assert.equal(novo.resultado_sentenca, 'procedente');
      assert.equal(novo.valor, 800);
      assert.equal(novo.id_juiz, 77);
      // o pedido já cadastrado e não mencionado fica sem resultado, com o juiz
      const antigo = lista.find((p) => p.nome_pedido === 'Danos morais');
      assert.equal(antigo.resultado, null);
      assert.equal(antigo.id_juiz, 77);
      // criado também no catálogo
      assert.ok(state.pedidosCatalogo.some((c) => c.nome_pedido === 'Adicional Noturno'));
    } finally {
      restore();
    }
  });

  await t.test('pedido novo reaproveita o catálogo ignorando maiúsculas/acentos', async () => {
    const { state, lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 3, idProcesso: 40,
      pedidos: [pedidoIA('HORAS EXTRAS', 'improcedente')],
      setup: (s) => {
        s.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_juiz: null, id_analise: null });
        s.pedidosVinculados.set(40, []);
      },
    });
    try {
      assert.equal(lista.length, 1);
      assert.equal(state.pedidosCatalogo.filter((c) => c.nome_pedido.toLowerCase() === 'horas extras').length, 2);
      assert.equal(state.pedidosCatalogo.length, 4); // nada novo criado
    } finally {
      restore();
    }
  });

  await t.test('dois danos morais com fundamentos diferentes: ambos registrados, cada um com seu resultado', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 3, idProcesso: 40,
      pedidos: [
        pedidoIA('Danos morais', 'improcedente', { descricao: 'em razão da rescisão' }),
        pedidoIA('Danos morais', 'procedente', { descricao: 'dano existencial', valor_identificado: 5000 }),
      ],
      setup: (s) => {
        s.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_juiz: 77, id_analise: null });
        // o usuário cadastrou apenas um "Danos morais", sem descrição
        s.pedidosVinculados.set(40, [vinculo(1, 200, 'Danos morais')]);
      },
    });
    try {
      assert.equal(lista.length, 2);
      const rescisao = lista.find((p) => p.descricao === 'em razão da rescisão');
      const existencial = lista.find((p) => p.descricao === 'dano existencial');
      assert.equal(rescisao.id_processo_pedido, 1); // reaproveitou o vínculo sem descrição
      assert.equal(rescisao.resultado, 'improcedente');
      assert.equal(existencial.resultado, 'procedente');
      assert.equal(existencial.valor, 5000);
      assert.equal(existencial.id_pedido, 200);
    } finally {
      restore();
    }
  });

  await t.test('vínculos já descritos são casados por nome + descrição', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 3, idProcesso: 40,
      pedidos: [
        pedidoIA('Danos morais', 'procedente', { descricao: 'Dano existencial' }),
        pedidoIA('Danos morais', 'improcedente', { descricao: 'Rescisão' }),
      ],
      setup: (s) => {
        s.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_juiz: 77, id_analise: null });
        s.pedidosVinculados.set(40, [
          vinculo(1, 200, 'Danos morais', { descricao: 'Rescisão' }),
          vinculo(2, 200, 'Danos morais', { descricao: 'Dano existencial' }),
        ]);
      },
    });
    try {
      assert.equal(lista.length, 2);
      assert.equal(lista.find((p) => p.id_processo_pedido === 1).resultado, 'improcedente');
      assert.equal(lista.find((p) => p.id_processo_pedido === 2).resultado, 'procedente');
    } finally {
      restore();
    }
  });

  await t.test('sentença: grava o juiz em todos os pedidos (os não mencionados pela IA ficam sem resultado)', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 11, idProcesso: 50,
      pedidos: [pedidoIA('Horas extras', 'improcedente', { fundamentacao_resumida: 'Sem prova da sobrejornada.' })],
      setup: (s) => {
        s.sentencas.set(11, { id_sentenca: 11, id_processo: 50, id_juiz: 77, id_analise: null });
        s.pedidosVinculados.set(50, [vinculo(1, 1, 'Horas extras'), vinculo(2, 2, 'Danos morais')]);
      },
    });
    try {
      const [horas, danos] = lista;
      assert.equal(horas.resultado, 'improcedente');
      assert.equal(horas.fundamentacao_sentenca, 'Sem prova da sobrejornada.');
      assert.equal(horas.id_juiz, 77);
      assert.equal(danos.resultado, null);
      assert.equal(danos.id_juiz, 77);
    } finally {
      restore();
    }
  });

  await t.test('acórdão: mantém pedido e juiz da 1ª instância, grava relator, muda o status e sinaliza reforma', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'acordao', idDecisao: 12, idProcesso: 51,
      pedidos: [pedidoIA('Horas extras', 'procedente'), pedidoIA('Danos morais', 'improcedente')],
      setup: (s) => {
        s.acordaos.set(12, { id_acordao: 12, id_processo: 51, id_relator: 33, id_analise: null, reforma_sentenca: null });
        s.pedidosVinculados.set(51, [
          vinculo(1, 1, 'Horas extras', { resultado: 'improcedente', resultado_sentenca: 'improcedente', id_juiz: 77 }),
          vinculo(2, 2, 'Danos morais', { resultado: 'improcedente', resultado_sentenca: 'improcedente', id_juiz: 77 }),
        ]);
      },
    });
    try {
      const [horas, danos] = lista;
      assert.equal(horas.id_juiz, 77);
      assert.equal(horas.resultado_sentenca, 'improcedente');
      assert.equal(horas.id_desembargador, 33);
      assert.equal(horas.resultado_acordao, 'procedente');
      assert.equal(horas.resultado, 'procedente');
      assert.equal(horas.reformado, true);
      assert.equal(danos.resultado, 'improcedente');
      assert.equal(danos.reformado, false);
      assert.equal(danos.id_juiz, 77);
      assert.equal(lista.length, 2);
    } finally {
      restore();
    }
  });

  await t.test('acórdão: pedido não mencionado não é alterado', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'acordao', idDecisao: 12, idProcesso: 51,
      pedidos: [pedidoIA('Horas extras', 'procedente')],
      setup: (s) => {
        s.acordaos.set(12, { id_acordao: 12, id_processo: 51, id_relator: 33, id_analise: null, reforma_sentenca: null });
        s.pedidosVinculados.set(51, [
          vinculo(1, 1, 'Horas extras', { resultado: 'improcedente', resultado_sentenca: 'improcedente', id_juiz: 77 }),
          vinculo(2, 2, 'Danos morais', { resultado: 'procedente', resultado_sentenca: 'procedente', id_juiz: 77 }),
        ]);
      },
    });
    try {
      assert.equal(lista[1].resultado, 'procedente');
      assert.equal(lista[1].id_desembargador, null);
      assert.equal(lista[1].reformado, null);
    } finally {
      restore();
    }
  });

  await t.test('sentença analisada depois do acórdão preserva o status do acórdão', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 11, idProcesso: 52,
      pedidos: [pedidoIA('Horas extras', 'improcedente')],
      setup: (s) => {
        s.sentencas.set(11, { id_sentenca: 11, id_processo: 52, id_juiz: 77, id_analise: null });
        s.pedidosVinculados.set(52, [
          vinculo(1, 1, 'Horas extras', { resultado: 'procedente', resultado_acordao: 'procedente', id_desembargador: 33 }),
        ]);
      },
    });
    try {
      assert.equal(lista[0].resultado, 'procedente');
      assert.equal(lista[0].resultado_sentenca, 'improcedente');
      assert.equal(lista[0].reformado, true);
    } finally {
      restore();
    }
  });

  await t.test('acórdão: IA preenche todos os campos vazios (tipo, tribunal, relator, desembargadores, data)', async () => {
    const h = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({
          tipo_documento: 'acordao',
          processo: { numero_processo: null, tribunal: 'tribunal regional do trabalho da 15ª região', comarca: null, vara: null },
          data_decisao: '2026-03-10',
          pedidos: [pedidoIA('Horas extras', 'procedente')],
          acordao: {
            reforma_sentenca: true,
            tipo_acordao: 'Parcialmente provido',
            relator: 'MARIA SOUZA',
            desembargador1: 'JOÃO DA SILVA',
            desembargador2: null,
          },
        }),
        model: 'x', inputTokens: 1, outputTokens: 1,
      }),
    });
    try {
      h.state.acordaos.set(40, {
        id_acordao: 40, id_processo: 60, id_analise: null, reforma_sentenca: null,
        id_tipo_acordao: null, id_tribunal: null, id_relator: null, id_desembargador1: null,
        id_desembargador2: null, data_acordao: null,
      });
      h.state.pedidosVinculados.set(60, [vinculo(1, 1, 'Horas extras', { resultado: 'improcedente', resultado_sentenca: 'improcedente', id_juiz: 77 })]);
      h.state.analises.set(901, novaAnalise(901));

      await h.service.processAnalysis({ tipoDecisao: 'acordao', idDecisao: 40, idProcesso: 60, idAnalise: 901, texto: 'Texto.' });

      const a = h.state.acordaos.get(40);
      assert.equal(h.state.analises.get(901).status, 'Concluída');
      assert.equal(a.id_tribunal, 1); // casou com o tribunal existente (sem duplicar)
      assert.equal(h.state.catalogos.tribunal.length, 1);
      assert.equal(a.id_relator, 33); // casou com "Maria Souza" existente
      assert.equal(h.state.catalogos.desembargador.length, 2);
      const novo = h.state.catalogos.desembargador.find((d) => d.id_desembargador === a.id_desembargador1);
      assert.equal(novo.nome_desembargador, 'João da Silva');
      assert.equal(novo.id_tribunal, 1);
      assert.equal(a.id_desembargador2, null);
      assert.equal(a.data_acordao, '2026-03-10');
      assert.equal(h.state.catalogos.tipoAcordao.length, 2); // "Parcialmente provido" criado
      assert.equal(a.id_tipo_acordao, h.state.catalogos.tipoAcordao[1].id_tipo_acordao);
      assert.equal(a.reforma_sentenca, true);
      // o relator preenchido pela IA é o julgador de 2º grau do pedido
      assert.equal(h.state.pedidosVinculados.get(60)[0].id_desembargador, 33);
    } finally {
      h.restore();
    }
  });

  await t.test('acórdão: campos já informados pelo usuário nunca são sobrescritos pela IA', async () => {
    const h = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({
          tipo_documento: 'acordao',
          data_decisao: '2026-03-10',
          pedidos: [],
          acordao: { reforma_sentenca: null, tipo_acordao: 'Provido', relator: 'Outro Nome', desembargador1: null, desembargador2: null },
        }),
        model: 'x', inputTokens: 1, outputTokens: 1,
      }),
    });
    try {
      h.state.acordaos.set(41, {
        id_acordao: 41, id_processo: 61, id_analise: null, reforma_sentenca: null,
        id_tipo_acordao: 5, id_tribunal: null, id_relator: 33, id_desembargador1: null,
        id_desembargador2: null, data_acordao: '2025-01-02',
      });
      h.state.analises.set(902, novaAnalise(902));

      await h.service.processAnalysis({ tipoDecisao: 'acordao', idDecisao: 41, idProcesso: 61, idAnalise: 902, texto: 'Texto.' });

      const a = h.state.acordaos.get(41);
      assert.equal(a.id_tipo_acordao, 5);
      assert.equal(a.id_relator, 33);
      assert.equal(a.data_acordao, '2025-01-02');
      assert.equal(h.state.catalogos.desembargador.length, 1); // "Outro Nome" nem foi cadastrado
    } finally {
      h.restore();
    }
  });

  await t.test('pedido cadastrado com descrição diferente é reaproveitado quando é o único do nome', async () => {
    const { lista, restore } = await rodar({
      tipoDecisao: 'sentenca', idDecisao: 3, idProcesso: 40,
      pedidos: [pedidoIA('Danos morais', 'procedente', { descricao: 'dano existencial', valor_identificado: 3000 })],
      setup: (s) => {
        s.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_juiz: 77, id_analise: null });
        s.pedidosVinculados.set(40, [vinculo(1, 200, 'Danos morais', { descricao: 'Rescisão indireta' })]);
      },
    });
    try {
      assert.equal(lista.length, 1);
      assert.equal(lista[0].id_processo_pedido, 1);
      assert.equal(lista[0].descricao, 'Rescisão indireta'); // cadastro do usuário mantido
      assert.equal(lista[0].resultado, 'procedente');
      assert.equal(lista[0].valor, 3000);
    } finally {
      restore();
    }
  });
});

test('decisionAnalysisService.startAnalysis', async (t) => {
  await t.test('cria a análise como Pendente antes de qualquer chamada à IA e retorna imediatamente', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => ({ data: validAnalysisPayload(), model: 'x', inputTokens: 1, outputTokens: 1 }),
    });

    try {
      state.sentencas.set(1, { id_sentenca: 1, id_processo: 10, id_analise: null });

      const analise = await service.startAnalysis({ tipoDecisao: 'sentenca', idDecisao: 1, texto: 'Texto.', arquivo: undefined });

      assert.equal(analise.status, 'Pendente');
      assert.equal(state.sentencas.get(1).id_analise, analise.id_analise);
    } finally {
      restore();
    }
  });

  await t.test('rejeita tipo de decisão inválido com 400', async () => {
    const { service, restore } = setupHarness({ analyzeDecisionImpl: async () => ({}) });
    try {
      await assert.rejects(
        () => service.startAnalysis({ tipoDecisao: 'despacho', idDecisao: 1, texto: 'x' }),
        (err) => err.status === 400
      );
    } finally {
      restore();
    }
  });

  await t.test('rejeita decisão inexistente com 404', async () => {
    const { service, restore } = setupHarness({ analyzeDecisionImpl: async () => ({}) });
    try {
      await assert.rejects(
        () => service.startAnalysis({ tipoDecisao: 'sentenca', idDecisao: 999, texto: 'x' }),
        (err) => err.status === 404
      );
    } finally {
      restore();
    }
  });

  await t.test('rejeita nova análise se já existe uma em andamento para a mesma decisão', async () => {
    const { service, state, restore } = setupHarness({ analyzeDecisionImpl: async () => ({}) });
    try {
      state.sentencas.set(1, { id_sentenca: 1, id_processo: 10, id_analise: 50 });
      state.analises.set(50, { id_analise: 50, status: 'Em Análise' });

      await assert.rejects(
        () => service.startAnalysis({ tipoDecisao: 'sentenca', idDecisao: 1, texto: 'x' }),
        (err) => err.status === 409
      );
    } finally {
      restore();
    }
  });

  await t.test('rejeita nova análise se a decisão já foi analisada com sucesso', async () => {
    const { service, state, restore } = setupHarness({ analyzeDecisionImpl: async () => ({}) });
    try {
      state.sentencas.set(1, { id_sentenca: 1, id_processo: 10, id_analise: 51 });
      state.analises.set(51, { id_analise: 51, status: 'Concluída' });

      await assert.rejects(
        () => service.startAnalysis({ tipoDecisao: 'sentenca', idDecisao: 1, texto: 'x' }),
        (err) => err.status === 409
      );
    } finally {
      restore();
    }
  });

  await t.test('permite tentar novamente quando a análise anterior terminou em Erro', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => ({ data: validAnalysisPayload(), model: 'x', inputTokens: 1, outputTokens: 1 }),
    });
    try {
      state.sentencas.set(1, { id_sentenca: 1, id_processo: 10, id_analise: 52 });
      state.analises.set(52, { id_analise: 52, status: 'Erro' });

      const novaAnalise = await service.startAnalysis({ tipoDecisao: 'sentenca', idDecisao: 1, texto: 'x' });
      assert.notEqual(novaAnalise.id_analise, 52);
      assert.equal(novaAnalise.status, 'Pendente');
    } finally {
      restore();
    }
  });
});
