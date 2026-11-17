const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/processoPedido.controller');
const { addSchema, updateSchema } = require('../validators/processoPedido.validator');

const router = Router({ mergeParams: true });

router.get('/', controller.list);
router.post('/', validate(addSchema), controller.add);
// :idVinculo = id_processo_pedido (o mesmo pedido pode aparecer mais de uma vez)
router.put('/:idVinculo', validate(updateSchema), controller.update);
router.delete('/:idVinculo', controller.remove);

module.exports = router;
