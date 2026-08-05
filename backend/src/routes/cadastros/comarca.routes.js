const { comarcaRepository, tribunalRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: comarcaRepository,
  resourceName: 'Comarca',
  nameColumn: 'nome_comarca',
  parentRepository: tribunalRepository,
  parentRequired: true, // comarca.id_tribunal é NOT NULL no schema
});

const controller = createCatalogController({
  service,
  repository: comarcaRepository,
  resourceName: 'Comarca',
});

const schema = createCatalogSchema({
  nameColumn: 'nome_comarca',
  maxLength: 100,
  parentColumn: 'id_tribunal',
  parentRequired: true,
});

module.exports = createCatalogRouter({ controller, schema });
