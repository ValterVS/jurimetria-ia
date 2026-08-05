const { varaRepository, comarcaRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: varaRepository,
  resourceName: 'Vara',
  nameColumn: 'nome_vara',
  parentRepository: comarcaRepository,
  parentRequired: true, // vara.id_comarca é NOT NULL no schema
});

const controller = createCatalogController({
  service,
  repository: varaRepository,
  resourceName: 'Vara',
});

const schema = createCatalogSchema({
  nameColumn: 'nome_vara',
  maxLength: 100,
  parentColumn: 'id_comarca',
  parentRequired: true,
});

module.exports = createCatalogRouter({ controller, schema });
