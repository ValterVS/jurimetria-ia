const sentencaRepository = require('../repositories/sentenca.repository');
const processoRepository = require('../repositories/processo.repository');
const {
  juizRepository,
  tipoSentencaRepository,
  tribunalRepository,
  comarcaRepository,
  varaRepository,
} = require('../repositories/cadastros.repository');
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

async function listByProcesso(idProcesso) {
  await ensureProcessoExists(idProcesso);
  return sentencaRepository.findByProcesso(idProcesso);
}

async function getById(id) {
  const sentenca = await sentencaRepository.findById(id);
  if (!sentenca) {
    throw httpError(404, 'Sentença não encontrada.');
  }
  return sentenca;
}

async function create(idProcesso, data) {
  await ensureProcessoExists(idProcesso);
  await validateFKs(data, { requireJuizETipo: true });
  return sentencaRepository.create({ ...data, id_processo: idProcesso });
}

async function update(id, data) {
  await getById(id);
  await validateFKs(data, { requireJuizETipo: true });
  return sentencaRepository.update(id, data);
}

async function remove(id) {
  await getById(id);
  await sentencaRepository.remove(id);
}

module.exports = { listByProcesso, getById, create, update, remove };
