const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const sentencaService = require('../services/sentenca.service');
const decisionAnalysisService = require('../ai/decisionAnalysisService');

function parseId(rawId, label) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label}: id inválido.`);
  }
  return id;
}

const listByProcesso = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const items = await sentencaService.listByProcesso(idProcesso, req.empresa.id_empresa);
  res.json(items);
});

const create = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const created = await sentencaService.create(idProcesso, req.body, req.empresa.id_empresa);
  res.status(201).json(created);
});

const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Sentença');
  const item = await sentencaService.getById(id, req.empresa.id_empresa);
  res.json(item);
});

const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Sentença');
  const updated = await sentencaService.update(id, req.body, req.empresa.id_empresa);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Sentença');
  await sentencaService.remove(id, req.empresa.id_empresa);
  res.status(204).send();
});

// POST /api/sentencas/:id/analisar - dispara a análise por IA em segundo
// plano; frontend acompanha via polling em GET /api/analises/:id.
const analisar = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Sentença');
  await sentencaService.getById(id, req.empresa.id_empresa);
  const analise = await decisionAnalysisService.startAnalysis({
    tipoDecisao: 'sentenca',
    idDecisao: id,
    texto: req.body.texto,
    arquivo: req.file,
  });
  res.status(202).json(analise);
});

module.exports = { listByProcesso, create, getById, update, remove, analisar };
