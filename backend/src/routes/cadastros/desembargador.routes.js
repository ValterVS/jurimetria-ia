const { desembargadorRepository, tribunalRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: desembargadorRepository,
  resourceName: 'Desembargador',
  nameColumn: 'nome_desembargador',
  parentRepository: tribunalRepository,
  parentRequired: false, // desembargador.id_tribunal é nullable no schema original
});

const controller = createCatalogController({
  service,
  repository: desembargadorRepository,
  resourceName: 'Desembargador',
});

const schema = createCatalogSchema({
  nameColumn: 'nome_desembargador',
  maxLength: 120,
  parentColumn: 'id_tribunal',
  parentRequired: false,
});

module.exports = createCatalogRouter({ controller, schema });
