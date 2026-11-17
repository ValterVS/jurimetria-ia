const sentencaRepository = require('../repositories/sentenca.repository');
const processoRepository = require('../repositories/processo.repository');
const { ensurePedidosVinculados } = require('./processoPedido.service');
const {
  juizRepository,
  tipoSentencaRepository,
  tribunalRepository,
  comarcaRepository,
  varaRepository,
} = require('../repositories/cadastros.repository');
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

async function validateFKs(data, { requireJuizETipo }) {
  if (requireJuizETipo) {
    if (!data.id_juiz) throw httpError(400, 'Sentença: o campo id_juiz é obrigatório.');
    if (!data.id_tipo_sentenca) throw httpError(400, 'Sentença: o campo id_tipo_sentenca é obrigatório.');
  }
  await ensureExists(juizRepository, data.id_juiz, 'Juiz');
  await ensureExists(tipoSentencaRepository, data.id_tipo_sentenca, 'Tipo de sentença');
  await ensureExists(tribunalRepository, data.id_tribunal, 'Tribunal');
  await ensureExists(comarcaRepository, data.id_comarca, 'Comarca');
  await ensureExists(varaRepository, data.id_vara, 'Vara');
}

async function listByProcesso(idProcesso, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  return sentencaRepository.findByProcesso(idProcesso);
}

// idEmpresa é opcional: quando informado, confirma que a sentença
// pertence a um processo da empresa logada antes de expor o registro.
async function getById(id, idEmpresa) {
  const sentenca = await sentencaRepository.findById(id);
  if (!sentenca) {
    throw httpError(404, 'Sentença não encontrada.');
  }
  if (idEmpresa !== undefined && idEmpresa !== null) {
    await ensureProcessoExists(sentenca.id_processo, idEmpresa);
  }
  return sentenca;
}

async function create(idProcesso, data, idEmpresa) {
  await ensureProcessoExists(idProcesso, idEmpresa);
  await ensurePedidosVinculados(idProcesso);
  await validateFKs(data, { requireJuizETipo: true });
  return sentencaRepository.create({ ...data, id_processo: idProcesso });
}

async function update(id, data, idEmpresa) {
  await getById(id, idEmpresa);
  await validateFKs(data, { requireJuizETipo: true });
  return sentencaRepository.update(id, data);
}

async function remove(id, idEmpresa) {
  await getById(id, idEmpresa);
  await sentencaRepository.remove(id);
}

module.exports = { listByProcesso, getById, create, update, remove };
