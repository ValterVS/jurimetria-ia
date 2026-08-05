const { createCatalogRepository } = require('./catalogRepository.factory');

// pedidos é estruturalmente um catálogo (id + nome único), mas é exposto
// como recurso de primeira classe em /api/pedidos por ser central ao
// domínio (usado tanto no cadastro do processo quanto na jurimetria).
module.exports = createCatalogRepository({
  table: 'pedidos',
  idColumn: 'id_pedido',
  nameColumn: 'nome_pedido',
});
