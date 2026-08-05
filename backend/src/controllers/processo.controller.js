const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const processoService = require('../services/processo.service');

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, 'Processo: id inválido.');
  }
  return id;
}

const list = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0, ...filters } = req.query;
  const result = await processoService.list(filters, { limit, offset });
  res.json({ ...result, limit, offset });
});

const getById = asyncHandler(async (req, res) => {
  const processo = await processoService.getById(parseId(req.params.id));
  res.json(processo);
});

const create = asyncHandler(async (req, res) => {
  const created = await processoService.create(req.body);
  res.status(201).json(created);
});

const update = asyncHandler(async (req, res) => {
  const updated = await processoService.update(parseId(req.params.id), req.body);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  await processoService.remove(parseId(req.params.id));
  res.status(204).send();
});

module.exports = { list, getById, create, update, remove, parseId };
