const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/processoParte.controller');
const { addSchema, updateSchema } = require('../validators/processoParte.validator');

// mergeParams: montado em processo.routes.js como '/:id/partes'
const router = Router({ mergeParams: true });

router.get('/', controller.list);
router.post('/', validate(addSchema), controller.add);
router.put('/:idParte', validate(updateSchema), controller.update);
router.delete('/:idParte', controller.remove);

module.exports = router;
