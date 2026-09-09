// Orquestra o fluxo completo de análise de uma decisão (sentença ou
// acórdão) por IA, conforme o fluxo obrigatório do projeto:
//
//   1. registra a análise no banco como Pendente ANTES de qualquer
//      chamada externa (a decisão nunca pode ficar sem esse registro);
//   2. processa em segundo plano (Em Análise -> anonimiza -> chama a
//      IA -> valida -> Concluída), sem bloquear a resposta HTTP;
//   3. em caso de falha em qualquer etapa, marca Erro com erro_log,
//      preservando a sentença/acórdão e a análise (nunca perde dado).
const analiseDecisaoRepository = require('../repositories/analiseDecisao.repository');
const sentencaRepository = require('../repositories/sentenca.repository');
const acordaoRepository = require('../repositories/acordao.repository');
const processoPedidoRepository = require('../repositories/processoPedido.repository');
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

// Tenta casar cada pedido identificado pela IA (texto livre, ex: "Horas
// extras") com os pedidos já cadastrados e vinculados a este processo,
// por nome (case-insensitive). Pedidos sem correspondência são
// ignorados: a IA nunca cria pedidos novos no catálogo automaticamente,
// para não fragmentar a jurimetria com variações de texto livre - isso
// fica a critério do usuário, cadastrando o pedido antes.
async function applyPedidosResults(idProcesso, pedidosAnalisados) {
  if (!Array.isArray(pedidosAnalisados) || pedidosAnalisados.length === 0) return;

  const vinculados = await processoPedidoRepository.findByProcesso(idProcesso);
  const porNome = new Map(vinculados.map((p) => [p.nome_pedido.trim().toLowerCase(), p]));

  for (const pedidoIA of pedidosAnalisados) {
    const chave = (pedidoIA.nome || '').trim().toLowerCase();
    const vinculo = porNome.get(chave);
    if (!vinculo) continue;

    const resultado = pedidoIA.resultado === 'nao_identificado' ? null : pedidoIA.resultado;
    const valor = pedidoIA.valor_identificado ?? vinculo.valor ?? null;

    await processoPedidoRepository.update(idProcesso, vinculo.id_pedido, { valor, resultado });
  }
}

// Só preenche reforma_sentenca via IA se o usuário ainda não tiver
// definido esse campo manualmente ao cadastrar o acórdão (Fase 5) -
// decisão deliberada para nunca sobrescrever dado humano em silêncio.
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

    await applyPedidosResults(idProcesso, resultado.data.pedidos);

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

  // Passo 1, obrigatório antes de qualquer chamada externa: registra a
  // existência da análise (status Pendente) e vincula à decisão.
  const analise = await analiseDecisaoRepository.create();
  await repository.linkAnalise(idDecisao, analise.id_analise);

  // Processamento em segundo plano: a resposta HTTP não fica bloqueada
  // esperando a Anthropic (pode levar dezenas de segundos). O frontend
  // acompanha via polling em GET /api/analises/:id. Limitação MVP
  // conhecida: se o processo Node reiniciar no meio do processamento, a
  // análise fica presa em "Em Análise" (sem fila/worker persistente
  // nesta versão) - aceitável para o escopo do protótipo, documentado
  // aqui para não ser esquecido.
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

async function getAnalysisById(id) {
  const analise = await analiseDecisaoRepository.findById(id);
  if (!analise) {
    throw httpError(404, 'Análise não encontrada.');
  }
  return analise;
}

// processAnalysis também é exportado (além de startAnalysis, que é o que
// as rotas realmente usam) só para permitir testar o fluxo de
// processamento em segundo plano de forma determinística (await direto),
// sem depender de timing de fire-and-forget - ver tests/decisionAnalysisService.test.js.
module.exports = { startAnalysis, getAnalysisById, processAnalysis };
