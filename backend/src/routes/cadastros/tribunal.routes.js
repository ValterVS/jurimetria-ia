const { tribunalRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: tribunalRepository,
  resourceName: 'Tribunal',
  nameColumn: 'nome_tribunal',
  normalizeNames: true,
});

const controller = createCatalogController({
  service,
  repository: tribunalRepository,
  resourceName: 'Tribunal',
});

const schema = createCatalogSchema({ nameColumn: 'nome_tribunal', maxLength: 100 });

module.exports = createCatalogRouter({ controller, schema });
