const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const parteService = require('../services/parte.service');

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, 'Parte: id inválido.');
  }
  return id;
}

const list = asyncHandler(async (req, res) => {
  const items = await parteService.list(req.query);
  res.json(items);
});

const getById = asyncHandler(async (req, res) => {
  const item = await parteService.getById(parseId(req.params.id));
  res.json(item);
});

const create = asyncHandler(async (req, res) => {
  const created = await parteService.create(req.body);
  res.status(201).json(created);
});

const update = asyncHandler(async (req, res) => {
  const updated = await parteService.update(parseId(req.params.id), req.body);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  await parteService.remove(parseId(req.params.id));
  res.status(204).send();
});

module.exports = { list, getById, create, update, remove };
