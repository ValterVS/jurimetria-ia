const { tipoAcordaoRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: tipoAcordaoRepository,
  resourceName: 'Tipo de acórdão',
  nameColumn: 'tipo_acordao',
  normalizeNames: true,
});

const controller = createCatalogController({
  service,
  repository: tipoAcordaoRepository,
  resourceName: 'Tipo de acórdão',
});

const schema = createCatalogSchema({ nameColumn: 'tipo_acordao', maxLength: 160 });

module.exports = createCatalogRouter({ controller, schema });
