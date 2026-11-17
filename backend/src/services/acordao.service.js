const acordaoRepository = require('../repositories/acordao.repository');
const processoRepository = require('../repositories/processo.repository');
const { ensurePedidosVinculados } = require('./processoPedido.service');
const { desembargadorRepository, tipoAcordaoRepository, tribunalRepository } = require('../repositories/cadastros.repository');
const { httpError } = require('../utils/httpError');

async function ensureProcessoExists(idProcesso, idEmpresa) {
  const processo = await processoRepository.findById(idProcesso, idEmpresa);
  if (!processo) {
    throw httpError(404, 'Processo não encontrado.');
  }
}

async function ensureExists(repository, id, label) {
  if (id === undefined || id === null) return;
  const found = await repository.findById(id);
  if (!found) {
    throw httpError(400, `${label} informado (id ${id}) não existe.`);
  }
}

async function validateFKs(data) {
  await ensureExists(tipoAcordaoRepository, data.id_tipo_acordao, 'Tipo de acórdão');
  await ensureExists(desembargadorRepository, data.id_relator, 'Relator (desembargador)');
  await ensureExists(desembargadorRepository, data.id_desembargador1, 'Desembargador 1');
  await ensureExists(desembargadorRepository, data.id_desembargador2, 'Desembargador 2');
  await ensureExists(tribunalRepository, data.id_tribunal, 'Tribunal');
}

async function listByProcesso(idProcesso, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  return acordaoRepository.findByProcesso(idProcesso);
}

async function getById(id, idEmpresa) {
  const acordao = await acordaoRepository.findById(id);
  if (!acordao) {
    throw httpError(404, 'Acórdão não encontrado.');
  }
  if (idEmpresa !== undefined && idEmpresa !== null) {
    await ensureProcessoExists(acordao.id_processo, idEmpresa);
  }
  return acordao;
}

async function create(idProcesso, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  await ensurePedidosVinculados(idProcesso);
  await validateFKs(data);
  return acordaoRepository.create({ ...data, id_processo: idProcesso });
}

async function update(id, data, idEmpresa) {
  await getById(id, idEmpresa);
  await validateFKs(data);
  return acordaoRepository.update(id, data);
}

async function remove(id, idEmpresa) {
  await getById(id, idEmpresa);
  await acordaoRepository.remove(id);
}

module.exports = { listByProcesso, getById, create, update, remove };
