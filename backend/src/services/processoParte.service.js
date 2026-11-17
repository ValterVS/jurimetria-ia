const processoParteRepository = require('../repositories/processoParte.repository');
const processoRepository = require('../repositories/processo.repository');
const parteRepository = require('../repositories/parte.repository');
const { tipoParteRepository } = require('../repositories/cadastros.repository');
const { httpError } = require('../utils/httpError');

const PG_UNIQUE_VIOLATION = '23505';

async function ensureProcessoExists(idProcesso, idEmpresa) {
  const processo = await processoRepository.findById(idProcesso, idEmpresa);
  if (!processo) {
    throw httpError(404, 'Processo não encontrado.');
  }
}

async function ensureTipoParteExists(idTipoParte) {
  if (!idTipoParte) return;
  const tipo = await tipoParteRepository.findById(idTipoParte);
  if (!tipo) {
    throw httpError(400, `O tipo de parte informado (id ${idTipoParte}) não existe.`);
  }
}

async function list(idProcesso, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  return processoParteRepository.findByProcesso(idProcesso);
}

async function add(idProcesso, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);

  const parte = await parteRepository.findById(data.id_parte);
  if (!parte) {
    throw httpError(400, `A parte informada (id ${data.id_parte}) não existe.`);
  }

  await ensureTipoParteExists(data.id_tipo_parte);

  try {
    return await processoParteRepository.create(idProcesso, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, 'Esta parte já está vinculada a este processo.');
    }
    throw error;
  }
}

async function update(idProcesso, idParte, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  const existing = await processoParteRepository.findOne(idProcesso, idParte);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e parte não encontrado.');
  }

  await ensureTipoParteExists(data.id_tipo_parte);

  return processoParteRepository.update(idProcesso, idParte, data);
}

async function remove(idProcesso, idParte, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  const existing = await processoParteRepository.findOne(idProcesso, idParte);
  if (!existing) {
    throw httpError(404, 'Vínculo entre processo e parte não encontrado.');
  }
  await processoParteRepository.remove(idProcesso, idParte);
}

module.exports = { list, add, update, remove };
