const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const acordaoService = require('../services/acordao.service');
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
  const items = await acordaoService.listByProcesso(idProcesso, req.empresa.id_empresa);
  res.json(items);
});

const create = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const created = await acordaoService.create(idProcesso, req.body, req.empresa.id_empresa);
  res.status(201).json(created);
});

const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Acórdão');
  const item = await acordaoService.getById(id, req.empresa.id_empresa);
  res.json(item);
});

const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Acórdão');
  const updated = await acordaoService.update(id, req.body, req.empresa.id_empresa);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Acórdão');
  await acordaoService.remove(id, req.empresa.id_empresa);
  res.status(204).send();
});

// POST /api/acordaos/:id/analisar - ver comentário equivalente em
// sentenca.controller.js.
const analisar = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'Acórdão');
  await acordaoService.getById(id, req.empresa.id_empresa);
  const analise = await decisionAnalysisService.startAnalysis({
    tipoDecisao: 'acordao',
    idDecisao: id,
    texto: req.body.texto,
    arquivo: req.file,
  });
  res.status(202).json(analise);
});

module.exports = { listByProcesso, create, getById, update, remove, analisar };
