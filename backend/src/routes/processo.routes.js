const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/processo.controller');
const { processoSchema, listQuerySchema } = require('../validators/processo.validator');
const processoPartesRouter = require('./processoPartes.routes');
const processoPedidosRouter = require('./processoPedidos.routes');
const processoSentencasRouter = require('./processoSentencas.routes');
const processoAcordaosRouter = require('./processoAcordaos.routes');

const router = Router();

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(processoSchema), controller.create);
router.put('/:id', validate(processoSchema), controller.update);
router.delete('/:id', controller.remove);

// Sub-recursos de relacionamento (processo_partes / processo_pedidos).
router.use('/:id/partes', processoPartesRouter);
router.use('/:id/pedidos', processoPedidosRouter);
router.use('/:id/sentencas', processoSentencasRouter);
router.use('/:id/acordaos', processoAcordaosRouter);

module.exports = router;
