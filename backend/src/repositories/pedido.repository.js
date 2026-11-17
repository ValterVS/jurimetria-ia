const { createCatalogRepository } = require('./catalogRepository.factory');

module.exports = createCatalogRepository({
  table: 'pedidos',
  idColumn: 'id_pedido',
  nameColumn: 'nome_pedido',
});
