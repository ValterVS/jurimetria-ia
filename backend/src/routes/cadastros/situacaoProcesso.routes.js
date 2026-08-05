const { situacaoProcessoRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: situacaoProcessoRepository,
  resourceName: 'Situação do processo',
  nameColumn: 'nome_situacao',
});

const controller = createCatalogController({
  service,
  repository: situacaoProcessoRepository,
  resourceName: 'Situação do processo',
});

const schema = createCatalogSchema({ nameColumn: 'nome_situacao', maxLength: 50 });

module.exports = createCatalogRouter({ controller, schema });
