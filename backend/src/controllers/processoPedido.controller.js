const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const service = require('../services/processoPedido.service');

function parseId(rawId, label) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label}: id inválido.`);
  }
  return id;
}

const list = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const items = await service.list(idProcesso, req.empresa.id_empresa);
  res.json(items);
});

const add = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const created = await service.add(idProcesso, req.body, req.empresa.id_empresa);
  res.status(201).json(created);
});

const update = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const idVinculo = parseId(req.params.idVinculo, 'Pedido do processo');
  const updated = await service.update(idProcesso, idVinculo, req.body, req.empresa.id_empresa);
  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  const idProcesso = parseId(req.params.id, 'Processo');
  const idVinculo = parseId(req.params.idVinculo, 'Pedido do processo');
  await service.remove(idProcesso, idVinculo, req.empresa.id_empresa);
  res.status(204).send();
});

module.exports = { list, add, update, remove };
