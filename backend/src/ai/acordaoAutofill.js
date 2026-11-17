// Preenche automaticamente os campos de cadastro do acórdão (tipo, tribunal,
// relator, desembargadores 1 e 2, data) a partir da análise da IA.
//  - Só preenche o que ainda está vazio: o que o usuário informou é mantido.
//  - Nomes ainda inexistentes nos catálogos são cadastrados (sem duplicar
//    variações de maiúscula/acento), como no cadastro "na hora" dos formulários.
const acordaoRepository = require('../repositories/acordao.repository');
const {
  tribunalRepository,
  desembargadorRepository,
  tipoAcordaoRepository,
} = require('../repositories/cadastros.repository');
const { normalizarChave, formatarNome } = require('../utils/nomeCatalogo');

function limpar(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

// "JOÃO DA SILVA" (caixa alta do documento) vira "João da Silva"
function nomeDeExibicao(nome) {
  const limpo = nome.replace(/\s+/g, ' ').trim();
  return formatarNome(limpo === limpo.toUpperCase() ? limpo.toLowerCase() : limpo);
}

async function acharOuCriar(repository, nome, { parentId = null } = {}) {
  const chave = normalizarChave(nome);
  const candidatos = await repository.findAll(repository.parentColumn && parentId ? { parentId } : {});
  const existente = candidatos.find((c) => normalizarChave(c[repository.nameColumn]) === chave);
  if (existente) return existente[repository.idColumn];

  const dados = { [repository.nameColumn]: nomeDeExibicao(nome) };
  if (repository.parentColumn) dados[repository.parentColumn] = parentId;
  const criado = await repository.create(dados);
  return criado[repository.idColumn];
}

function dataValida(valor) {
  const texto = limpar(valor);
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const data = new Date(`${texto}T00:00:00Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto ? null : texto;
}

async function preencherAcordao(acordao, analise) {
  if (!acordao) return acordao;

  const info = analise.acordao || {};
  const campos = {};

  const tipo = limpar(info.tipo_acordao);
  if (tipo && !acordao.id_tipo_acordao) {
    campos.id_tipo_acordao = await acharOuCriar(tipoAcordaoRepository, tipo);
  }

  const tribunal = limpar(analise.processo?.tribunal);
  let idTribunal = acordao.id_tribunal ?? null;
  if (tribunal && !idTribunal) {
    idTribunal = await acharOuCriar(tribunalRepository, tribunal);
    campos.id_tribunal = idTribunal;
  }

  const pessoas = [
    ['id_relator', info.relator],
    ['id_desembargador1', info.desembargador1],
    ['id_desembargador2', info.desembargador2],
  ];
  for (const [coluna, nome] of pessoas) {
    const limpo = limpar(nome);
    if (limpo && !acordao[coluna]) {
      campos[coluna] = await acharOuCriar(desembargadorRepository, limpo, { parentId: idTribunal });
    }
  }

  const data = dataValida(analise.data_decisao);
  if (data && !acordao.data_acordao) campos.data_acordao = data;

  if (Object.keys(campos).length === 0) return acordao;
  return acordaoRepository.preencherCamposVazios(acordao.id_acordao, campos);
}

module.exports = { preencherAcordao };
