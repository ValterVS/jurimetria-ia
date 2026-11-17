const { juizRepository, varaRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: juizRepository,
  resourceName: 'Juiz',
  nameColumn: 'nome_juiz',
  parentRepository: varaRepository,
  parentRequired: false, // juiz.id_vara é nullable no schema original
  normalizeNames: true,
});

const controller = createCatalogController({
  service,
  repository: juizRepository,
  resourceName: 'Juiz',
});

const schema = createCatalogSchema({
  nameColumn: 'nome_juiz',
  maxLength: 120,
  parentColumn: 'id_vara',
  parentRequired: false,
});

module.exports = createCatalogRouter({ controller, schema });
