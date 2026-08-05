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
    nextAnaliseId: 1,
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
  };

  const fakeProcessoPedidoRepo = {
    findByProcesso: async (idProcesso) => state.pedidosVinculados.get(idProcesso) || [],
    update: async (idProcesso, idPedido, { valor, resultado }) => {
      const lista = state.pedidosVinculados.get(idProcesso) || [];
      const item = lista.find((p) => p.id_pedido === idPedido);
      if (item) {
        item.valor = valor;
        item.resultado = resultado;
      }
      return item;
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
    mockModule(paths.aiProvider, fakeAiProviderModule),
  ];
  clearCache(paths.service);
  const service = require(paths.service);

  return {
    service,
    state,
    restore: () => {
      restores.forEach((r) => r());
      clearCache(paths.service);
    },
  };
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
      state.pedidosVinculados.set(10, [{ id_pedido: 100, nome_pedido: 'Horas extras', valor: null, resultado: null }]);
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

  await t.test('pedido identificado pela IA sem correspondência no catálogo do processo é ignorado (nunca cria pedido novo)', async () => {
    const { service, state, restore } = setupHarness({
      analyzeDecisionImpl: async () => ({
        data: validAnalysisPayload({
          pedidos: [{ nome: 'Pedido Inexistente', resultado: 'procedente', valor_identificado: null, fundamentacao_resumida: null, trecho_relevante: null }],
        }),
        model: 'gpt-5.6-terra',
        inputTokens: 5,
        outputTokens: 5,
      }),
    });

    try {
      state.sentencas.set(3, { id_sentenca: 3, id_processo: 40, id_analise: null });
      state.pedidosVinculados.set(40, [{ id_pedido: 200, nome_pedido: 'Danos morais', valor: null, resultado: null }]);
      state.analises.set(7, {
        id_analise: 7,
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
        idDecisao: 3,
        idProcesso: 40,
        idAnalise: 7,
        texto: 'Texto qualquer.',
        arquivo: undefined,
      });

      assert.equal(state.analises.get(7).status, 'Concluída');
      // O pedido cadastrado não foi tocado, e nenhum pedido novo foi criado.
      assert.equal(state.pedidosVinculados.get(40).length, 1);
      assert.equal(state.pedidosVinculados.get(40)[0].resultado, null);
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
