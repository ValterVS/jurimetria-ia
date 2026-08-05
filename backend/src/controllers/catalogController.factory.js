const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');

function parseId(rawId, resourceName) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${resourceName}: id inválido.`);
  }
  return id;
}

// Fábrica de controller HTTP para os catálogos simples. Só traduz
// req/res <-> service; nenhuma regra de negócio mora aqui.
function createCatalogController({ service, repository, resourceName }) {
  const list = asyncHandler(async (req, res) => {
    const filters = {};
    if (repository.parentColumn && req.query[repository.parentColumn]) {
      filters.parentId = parseId(req.query[repository.parentColumn], resourceName);
    }
    const items = await service.list(filters);
    res.json(items);
  });

  const getById = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, resourceName);
    const item = await service.getById(id);
    res.json(item);
  });

  const create = asyncHandler(async (req, res) => {
    const created = await service.create(req.body);
    res.status(201).json(created);
  });

  const update = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, resourceName);
    const updated = await service.update(id, req.body);
    res.json(updated);
  });

  const remove = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, resourceName);
    await service.remove(id);
    res.status(204).send();
  });

  return { list, getById, create, update, remove };
}

module.exports = { createCatalogController, parseId };
