const processoPedidoRepository = require('../repositories/processoPedido.repository');
const processoRepository = require('../repositories/processo.repository');
const pedidoRepository = require('../repositories/pedido.repository');
const { httpError } = require('../utils/httpError');

const PG_UNIQUE_VIOLATION = '23505';

async function ensureProcessoExists(idProcesso) {
  const processo = await processoRepository.findById(idProcesso);
  if (!processo) {
    throw httpError(404, 'Processo não encontrado.');
  }
}

async function list(idProcesso) {
  await ensureProcessoExists(idProcesso);
  return processoPedidoRepository.findByProcesso(idProcesso);
}

async function add(idProcesso, data) {
  await ensureProcessoExists(idProcesso);

  const pedido = await pedidoRepository.findById(data.id_pedido);
  if (!pedido) {
    throw httpError(400, `O pedido informado (id ${data.id_pedido}) não existe.`);
  }

  try {
    return await processoPedidoRepository.create(idProcesso, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, 'Este pedido já está vinculado a este processo.');
    }
    throw error;
  }
}

async function update(idProcesso, idPedido, data) {
  const existing = await processoPedidoRepository.findOne(idProcesso, idPedido);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e pedido não encontrado.');
  }
  return processoPedidoRepository.update(idProcesso, idPedido, data);
}

async function remove(idProcesso, idPedido) {
  const existing = await processoPedidoRepository.findOne(idProcesso, idPedido);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e pedido não encontrado.');
  }
  await processoPedidoRepository.remove(idProcesso, idPedido);
}

module.exports = { list, add, update, remove };
