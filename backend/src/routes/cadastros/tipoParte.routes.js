const { tipoParteRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: tipoParteRepository,
  resourceName: 'Tipo de parte',
  nameColumn: 'nome_tipo',
});

const controller = createCatalogController({
  service,
  repository: tipoParteRepository,
  resourceName: 'Tipo de parte',
});

const schema = createCatalogSchema({ nameColumn: 'nome_tipo', maxLength: 50 });

module.exports = createCatalogRouter({ controller, schema });
