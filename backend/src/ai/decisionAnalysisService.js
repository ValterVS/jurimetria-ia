const analiseDecisaoRepository = require('../repositories/analiseDecisao.repository');
const sentencaRepository = require('../repositories/sentenca.repository');
const acordaoRepository = require('../repositories/acordao.repository');
const processoPedidoRepository = require('../repositories/processoPedido.repository');
const pedidoRepository = require('../repositories/pedido.repository');
const { normalizarChave, formatarNome } = require('../utils/nomeCatalogo');
const { preencherAcordao } = require('./acordaoAutofill');
const { getAIProvider } = require('./aiProvider');
const { anonymize } = require('../services/anonymization.service');
const { extractText } = require('../services/documentExtraction.service');
const { httpError } = require('../utils/httpError');

const MAX_ERRO_LOG_LENGTH = 2000;

const DECISION_REPOSITORIES = {
  sentenca: sentencaRepository,
  acordao: acordaoRepository,
};

function truncate(message) {
  if (!message) return 'Erro desconhecido durante o processamento.';
  return message.length > MAX_ERRO_LOG_LENGTH
    ? `${message.slice(0, MAX_ERRO_LOG_LENGTH)}... (truncado)`
    : message;
}

async function resolveInputText({ texto, arquivo }) {
  if (texto && texto.trim()) {
    return texto.trim();
  }
  if (arquivo) {
    const extraido = await extractText(arquivo);
    return extraido.trim();
  }
  throw httpError(400, 'Envie o texto da decisão ou um arquivo (PDF, TXT ou DOCX).');
}

// processo_pedidos.resultado só aceita procedente/improcedente/
// parcialmente_procedente (CHECK constraint); outros valores da IA viram
// NULL nessa coluna, mas continuam preservados em insights_json.
const RESULTADOS_NAO_PERSISTIVEIS = ['nao_identificado', 'objeto_de_transacao'];

// Acha (ou cria) o pedido no catálogo global pelo nome, ignorando
// maiúsculas/acentos, para que "Danos morais" e "danos morais" sejam o mesmo.
async function findOrCreatePedidoCatalogo(cache, nome) {
  const chave = normalizarChave(nome);
  if (cache.has(chave)) return cache.get(chave);

  const criado = await pedidoRepository.create({ nome_pedido: formatarNome(nome) });
  cache.set(chave, criado);
  return criado;
}

// Procura, entre os vínculos ainda não usados nesta análise, o que corresponde
// ao pedido da IA. `exato` exige nome + descrição iguais; sem `exato`, aceita
// um vínculo de mesmo nome sem descrição (preenchido agora) ou, quando a IA
// não trouxe descrição, o único vínculo de mesmo nome.
function encontrarVinculo(vinculos, usados, pedidoIA, { exato, pedidosIA }) {
  const nome = normalizarChave(pedidoIA.nome);
  const descricao = normalizarChave(pedidoIA.descricao);
  const candidatos = vinculos.filter(
    (v) => !usados.has(v.id_processo_pedido) && normalizarChave(v.nome_pedido) === nome
  );

  if (exato) {
    return candidatos.find((v) => normalizarChave(v.descricao) === descricao) || null;
  }
  if (descricao) {
    const semDescricao = candidatos.find((v) => !normalizarChave(v.descricao));
    if (semDescricao) return semDescricao;
    // Único pedido desse nome na decisão e único cadastrado com esse nome:
    // é o mesmo pedido, só descrito com outras palavras.
    const mesmoNomeNaDecisao = pedidosIA.filter((p) => normalizarChave(p.nome) === nome).length;
    return mesmoNomeNaDecisao === 1 && candidatos.length === 1 ? candidatos[0] : null;
  }
  return candidatos[0] || null;
}

// Grava o resultado de cada pedido analisado nos vínculos do processo.
//  - Pedidos de mesmo nome e fundamento diferente (descricao) viram vínculos
//    distintos, cada um com seu resultado.
//  - Pedido que a IA encontrou e ainda não estava cadastrado é criado já com
//    o resultado.
//  - SENTENÇA (1º grau): grava resultado_sentenca e o juiz; pedidos não
//    mencionados pela IA ficam sem resultado para esse juiz.
//  - ACÓRDÃO (2º grau): grava resultado_acordao e o relator, atualiza o status
//    e sinaliza a reforma, sem tocar no juiz nem no resultado da sentença.
async function applyPedidosResults(idProcesso, pedidosAnalisados, { tipoDecisao, idJuiz = null, idDesembargador = null } = {}) {
  const pedidosIA = Array.isArray(pedidosAnalisados) ? pedidosAnalisados : [];
  const vinculos = [...(await processoPedidoRepository.findByProcesso(idProcesso))];
  const usados = new Set();
  const casados = new Map(); // índice do pedido da IA -> vínculo

  const resolver = (modo) => {
    pedidosIA.forEach((pedidoIA, i) => {
      if (casados.has(i)) return;
      const vinculo = encontrarVinculo(vinculos, usados, pedidoIA, { ...modo, pedidosIA });
      if (vinculo) {
        casados.set(i, vinculo);
        usados.add(vinculo.id_processo_pedido);
      }
    });
  };
  resolver({ exato: true });
  resolver({ exato: false });

  let catalogo = null;
  for (let i = 0; i < pedidosIA.length; i += 1) {
    const pedidoIA = pedidosIA[i];
    if (!pedidoIA.nome || !pedidoIA.nome.trim()) continue;

    let vinculo = casados.get(i);
    const descricao = pedidoIA.descricao && pedidoIA.descricao.trim() ? pedidoIA.descricao.trim() : null;

    if (!vinculo) {
      if (!catalogo) {
        const todos = await pedidoRepository.findAll();
        catalogo = new Map(todos.map((p) => [normalizarChave(p.nome_pedido), p]));
      }
      const pedidoCatalogo = await findOrCreatePedidoCatalogo(catalogo, pedidoIA.nome);
      vinculo = await processoPedidoRepository.create(idProcesso, {
        id_pedido: pedidoCatalogo.id_pedido,
        descricao,
      });
      vinculos.push(vinculo);
      usados.add(vinculo.id_processo_pedido);
    }

    const dados = {
      valor: pedidoIA.valor_identificado ?? null,
      resultado: RESULTADOS_NAO_PERSISTIVEIS.includes(pedidoIA.resultado) ? null : pedidoIA.resultado,
      descricao,
      fundamentacao: pedidoIA.fundamentacao_resumida?.trim() || null,
    };

    if (tipoDecisao === 'acordao') {
      await processoPedidoRepository.registrarAcordao(vinculo.id_processo_pedido, {
        ...dados,
        id_desembargador: idDesembargador,
      });
    } else {
      await processoPedidoRepository.registrarSentenca(vinculo.id_processo_pedido, { ...dados, id_juiz: idJuiz });
    }
  }

  if (tipoDecisao !== 'acordao' && idJuiz) {
    const naoMencionados = vinculos.filter((v) => !usados.has(v.id_processo_pedido)).map((v) => v.id_processo_pedido);
    await processoPedidoRepository.definirJuizNosPedidos(naoMencionados, idJuiz);
  }
}

async function applyReformaSentenca(idAcordao, reformaSentencaIA) {
  if (reformaSentencaIA === null || reformaSentencaIA === undefined) return;

  const acordaoAtual = await acordaoRepository.findById(idAcordao);
  if (acordaoAtual && acordaoAtual.reforma_sentenca === null) {
    await acordaoRepository.updateReformaSentenca(idAcordao, reformaSentencaIA);
  }
}

async function processAnalysis({ tipoDecisao, idDecisao, idProcesso, idAnalise, texto, arquivo }) {
  try {
    await analiseDecisaoRepository.updateStatus(idAnalise, 'Em Análise');

    const textoOriginal = await resolveInputText({ texto, arquivo });
    const { textoAnonimizado } = anonymize(textoOriginal);

    const provider = getAIProvider();
    const resultado = await provider.analyzeDecision({
      texto: textoAnonimizado,
      tipoDocumentoSugerido: tipoDecisao,
    });

    await analiseDecisaoRepository.markConcluida(idAnalise, {
      insightsJson: resultado.data,
      inputTokens: resultado.inputTokens,
      outputTokens: resultado.outputTokens,
      plataforma: resultado.model,
    });

    let decisao = await DECISION_REPOSITORIES[tipoDecisao].findById(idDecisao);
    if (tipoDecisao === 'acordao') {
      // antes dos pedidos: o relator preenchido aqui é o julgador de 2º grau
      decisao = await preencherAcordao(decisao, resultado.data);
    }
    await applyPedidosResults(idProcesso, resultado.data.pedidos, {
      tipoDecisao,
      idJuiz: tipoDecisao === 'sentenca' ? decisao?.id_juiz ?? null : null,
      idDesembargador: tipoDecisao === 'acordao' ? decisao?.id_relator ?? null : null,
    });

    if (tipoDecisao === 'acordao') {
      await applyReformaSentenca(idDecisao, resultado.data.acordao?.reforma_sentenca ?? null);
    }
  } catch (error) {
    await analiseDecisaoRepository.markErro(idAnalise, truncate(error.message));
  }
}

async function startAnalysis({ tipoDecisao, idDecisao, texto, arquivo }) {
  const repository = DECISION_REPOSITORIES[tipoDecisao];
  if (!repository) {
    throw httpError(400, 'Tipo de decisão inválido.');
  }

  const decisao = await repository.findById(idDecisao);
  if (!decisao) {
    throw httpError(404, `${tipoDecisao === 'sentenca' ? 'Sentença' : 'Acórdão'} não encontrada.`);
  }

  if (decisao.id_analise) {
    const analiseExistente = await analiseDecisaoRepository.findById(decisao.id_analise);
    if (analiseExistente && ['Pendente', 'Em Análise'].includes(analiseExistente.status)) {
      throw httpError(409, 'Já existe uma análise em andamento para esta decisão.');
    }
    if (analiseExistente && analiseExistente.status === 'Concluída') {
      throw httpError(
        409,
        `Esta decisão já foi analisada (análise ${analiseExistente.id_analise}). Consulte GET /api/analises/${analiseExistente.id_analise}.`
      );
    }
    // status 'Erro': permitimos tentar novamente, criando uma nova análise
    // (a antiga fica preservada na tabela, para auditoria).
  }

  const analise = await analiseDecisaoRepository.create();
  await repository.linkAnalise(idDecisao, analise.id_analise);

  processAnalysis({
    tipoDecisao,
    idDecisao,
    idProcesso: decisao.id_processo,
    idAnalise: analise.id_analise,
    texto,
    arquivo,
  }).catch((error) => {
    console.error('[decisionAnalysisService] Falha não tratada no processamento em segundo plano:', error.message);
  });

  return analise;
}

// idEmpresa é opcional só para não quebrar chamadas internas (ex: testes);
// toda chamada vinda de uma rota HTTP deve sempre informá-lo.
async function getAnalysisById(id, idEmpresa) {
  const analise = await analiseDecisaoRepository.findById(id);
  if (!analise) {
    throw httpError(404, 'Análise não encontrada.');
  }
  if (idEmpresa !== undefined && idEmpresa !== null) {
    const empresaDona = await analiseDecisaoRepository.findEmpresaId(id);
    if (empresaDona !== idEmpresa) {
      throw httpError(404, 'Análise não encontrada.');
    }
  }
  return analise;
}

module.exports = { startAnalysis, getAnalysisById, processAnalysis };
