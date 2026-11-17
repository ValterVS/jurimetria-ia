const processoPedidoRepository = require('../repositories/processoPedido.repository');
const processoRepository = require('../repositories/processo.repository');
const pedidoRepository = require('../repositories/pedido.repository');
const { httpError } = require('../utils/httpError');

const PG_UNIQUE_VIOLATION = '23505';

async function ensureProcessoExists(idProcesso, idEmpresa) {
  const processo = await processoRepository.findById(idProcesso, idEmpresa);
  if (!processo) {
    throw httpError(404, 'Processo não encontrado.');
  }
}

async function list(idProcesso, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  return processoPedidoRepository.findByProcesso(idProcesso);
}

async function add(idProcesso, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);

  const pedido = await pedidoRepository.findById(data.id_pedido);
  if (!pedido) {
    throw httpError(400, `O pedido informado (id ${data.id_pedido}) não existe.`);
  }

  try {
    return await processoPedidoRepository.create(idProcesso, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(
        409,
        'Este pedido já está vinculado a este processo com a mesma descrição. Para o mesmo pedido com outro fundamento, informe uma descrição diferente.'
      );
    }
    throw error;
  }
}

async function update(idProcesso, idVinculo, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  const existing = await processoPedidoRepository.findOne(idProcesso, idVinculo);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e pedido não encontrado.');
  }
  try {
    return await processoPedidoRepository.update(idProcesso, idVinculo, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, 'Já existe este pedido com a mesma descrição neste processo.');
    }
    throw error;
  }
}

async function remove(idProcesso, idVinculo, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  const existing = await processoPedidoRepository.findOne(idProcesso, idVinculo);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e pedido não encontrado.');
  }
  await processoPedidoRepository.remove(idProcesso, idVinculo);
}

// a análise de IA grava o resultado nos pedidos do processo, então eles
// precisam estar vinculados antes de qualquer decisão ser registrada
async function ensurePedidosVinculados(idProcesso) {
  const pedidos = await processoPedidoRepository.findByProcesso(idProcesso);
  if (pedidos.length === 0) {
    throw httpError(
      409,
      'Vincule os pedidos do processo (aba Pedidos) antes de registrar uma decisão para análise.'
    );
  }
}

module.exports = { list, add, update, remove, ensurePedidosVinculados };
