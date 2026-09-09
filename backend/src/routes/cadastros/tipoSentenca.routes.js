const { tipoSentencaRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: tipoSentencaRepository,
  resourceName: 'Tipo de sentença',
  nameColumn: 'tipo_sentenca',
});

const controller = createCatalogController({
  service,
  repository: tipoSentencaRepository,
  resourceName: 'Tipo de sentença',
});

const schema = createCatalogSchema({ nameColumn: 'tipo_sentenca', maxLength: 80 });

module.exports = createCatalogRouter({ controller, schema });
