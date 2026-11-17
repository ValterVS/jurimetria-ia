const { Router } = require('express');
const validate = require('../middlewares/validate');

// Fábrica de router REST padrão (GET /, GET /:id, POST /, PUT /:id,
// DELETE /:id) para os catálogos simples.
function createCatalogRouter({ controller, schema }) {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', validate(schema), controller.create);
  router.post('/obter-ou-criar', validate(schema), controller.findOrCreate);
  router.put('/:id', validate(schema), controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = { createCatalogRouter };
