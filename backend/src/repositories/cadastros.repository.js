// Instâncias únicas dos repositories de catálogo (tabelas de apoio).
const { createCatalogRepository } = require('./catalogRepository.factory');

const tribunalRepository = createCatalogRepository({
  table: 'tribunal',
  idColumn: 'id_tribunal',
  nameColumn: 'nome_tribunal',
});

const comarcaRepository = createCatalogRepository({
  table: 'comarca',
  idColumn: 'id_comarca',
  nameColumn: 'nome_comarca',
  parentColumn: 'id_tribunal',
});

const varaRepository = createCatalogRepository({
  table: 'vara',
  idColumn: 'id_vara',
  nameColumn: 'nome_vara',
  parentColumn: 'id_comarca',
});

const juizRepository = createCatalogRepository({
  table: 'juiz',
  idColumn: 'id_juiz',
  nameColumn: 'nome_juiz',
  parentColumn: 'id_vara',
});

const desembargadorRepository = createCatalogRepository({
  table: 'desembargador',
  idColumn: 'id_desembargador',
  nameColumn: 'nome_desembargador',
  parentColumn: 'id_tribunal',
});

const ministroRepository = createCatalogRepository({
  table: 'ministro',
  idColumn: 'id_ministro',
  nameColumn: 'nome_ministro',
  parentColumn: 'id_tribunal',
});

const tipoParteRepository = createCatalogRepository({
  table: 'tipo_parte',
  idColumn: 'id_tipo_parte',
  nameColumn: 'nome_tipo',
});

// Atenção: a coluna se chama igual à tabela (herdado do SQL original).
const tipoSentencaRepository = createCatalogRepository({
  table: 'tipo_sentenca',
  idColumn: 'id_tipo_sentenca',
  nameColumn: 'tipo_sentenca',
});

const tipoAcordaoRepository = createCatalogRepository({
  table: 'tipo_acordao',
  idColumn: 'id_tipo_acordao',
  nameColumn: 'tipo_acordao',
});

const situacaoProcessoRepository = createCatalogRepository({
  table: 'situacao_processo',
  idColumn: 'id_situacao',
  nameColumn: 'nome_situacao',
});

module.exports = {
  tribunalRepository,
  comarcaRepository,
  varaRepository,
  juizRepository,
  desembargadorRepository,
  ministroRepository,
  tipoParteRepository,
  tipoSentencaRepository,
  tipoAcordaoRepository,
  situacaoProcessoRepository,
};
