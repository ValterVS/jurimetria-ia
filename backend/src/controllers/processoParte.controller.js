const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const service = require('../services/processoParte.service');

function parseId(rawId, label) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label}: id inválido.`);
  }
  return id;
}

const list = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const items = await service.list(idProcesso);
  res.json(items);
});

const add = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const created = await service.add(idProcesso, req.body);
  res.status(201).json(created);
});

const update = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const idParte = parseId(req.params.idParte, 'Parte');
  const updated = await service.update(idProcesso, idParte, req.body);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const idParte = parseId(req.params.idParte, 'Parte');
  await service.remove(idProcesso, idParte);
  res.status(204).send();
});

module.exports = { list, add, update, remove };
