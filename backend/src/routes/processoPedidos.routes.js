const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/processoPedido.controller');
const { addSchema, updateSchema } = require('../validators/processoPedido.validator');

const router = Router({ mergeParams: true });

router.get('/', controller.list);
router.post('/', validate(addSchema), controller.add);
router.put('/:idPedido', validate(updateSchema), controller.update);
router.delete('/:idPedido', controller.remove);

module.exports = router;
