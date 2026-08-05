const { Router } = require('express');
const validate = require('../middlewares/validate');
const { handleUpload } = require('../middlewares/upload');
const controller = require('../controllers/acordao.controller');
const { acordaoSchema } = require('../validators/acordao.validator');
const { analisarSchema } = require('../validators/analiseDecisao.validator');

// Acesso direto por id.
const router = Router();

router.get('/:id', controller.getById);
router.put('/:id', validate(acordaoSchema), controller.update);
router.delete('/:id', controller.remove);

router.post('/:id/analisar', handleUpload, validate(analisarSchema), controller.analisar);

module.exports = router;
