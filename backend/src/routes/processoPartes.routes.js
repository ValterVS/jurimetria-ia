const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/processoParte.controller');
const { addSchema, updateSchema } = require('../validators/processoParte.validator');

// mergeParams é essencial aqui: este router é montado em
// processo.routes.js como '/:id/partes', e precisamos enxergar o :id
// (do processo) definido no router pai.
const router = Router({ mergeParams: true });

router.get('/', controller.list);
router.post('/', validate(addSchema), controller.add);
router.put('/:idParte', validate(updateSchema), controller.update);
router.delete('/:idParte', controller.remove);

module.exports = router;
