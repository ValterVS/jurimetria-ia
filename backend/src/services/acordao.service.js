const acordaoRepository = require('../repositories/acordao.repository');
const processoRepository = require('../repositories/processo.repository');
const { desembargadorRepository, tipoAcordaoRepository, tribunalRepository } = require('../repositories/cadastros.repository');
const { httpError } = require('../utils/httpError');

async function ensureProcessoExists(idProcesso) {
  const processo = await processoRepository.findById(idProcesso);
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
  if (!data.id_tipo_acordao) {
    throw httpError(400, 'Acórdão: o campo id_tipo_acordao é obrigatório.');
  }
  await ensureExists(tipoAcordaoRepository, data.id_tipo_acordao, 'Tipo de acórdão');
  await ensureExists(desembargadorRepository, data.id_relator, 'Relator (desembargador)');
  await ensureExists(desembargadorRepository, data.id_desembargador1, 'Desembargador 1');
  await ensureExists(desembargadorRepository, data.id_desembargador2, 'Desembargador 2');
  await ensureExists(tribunalRepository, data.id_tribunal, 'Tribunal');
}

async function listByProcesso(idProcesso) {
  await ensureProcessoExists(idProcesso);
  return acordaoRepository.findByProcesso(idProcesso);
}

async function getById(id) {
  const acordao = await acordaoRepository.findById(id);
  if (!acordao) {
    throw httpError(404, 'Acórdão não encontrado.');
  }
  return acordao;
}

async function create(idProcesso, data) {
  await ensureProcessoExists(idProcesso);
  await validateFKs(data);
  return acordaoRepository.create({ ...data, id_processo: idProcesso });
}

async function update(id, data) {
  await getById(id);
  await validateFKs(data);
  return acordaoRepository.update(id, data);
}

async function remove(id) {
  await getById(id);
  await acordaoRepository.remove(id);
}

module.exports = { listByProcesso, getById, create, update, remove };
