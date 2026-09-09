const pedidoRepository = require('../repositories/pedido.repository');
const { createCatalogService } = require('../services/catalogService.factory');
const { createCatalogController } = require('../controllers/catalogController.factory');
const { createCatalogSchema } = require('../validators/catalogValidator');
const { createCatalogRouter } = require('./catalogRoutes.factory');

const service = createCatalogService({
  repository: pedidoRepository,
  resourceName: 'Pedido',
  nameColumn: 'nome_pedido',
});

const controller = createCatalogController({
  service,
  repository: pedidoRepository,
  resourceName: 'Pedido',
});

const schema = createCatalogSchema({ nameColumn: 'nome_pedido', maxLength: 200 });

module.exports = createCatalogRouter({ controller, schema });
