const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/parte.controller');
const { parteSchema, listQuerySchema } = require('../validators/parte.validator');

const router = Router();

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(parteSchema), controller.create);
router.put('/:id', validate(parteSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
