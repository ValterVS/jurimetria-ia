const { Router } = require('express');
const validate = require('../middlewares/validate');
const { handleUpload } = require('../middlewares/upload');
const controller = require('../controllers/sentenca.controller');
const { sentencaSchema } = require('../validators/sentenca.validator');
const { analisarSchema } = require('../validators/analiseDecisao.validator');

const router = Router();

router.get('/:id', controller.getById);
router.put('/:id', validate(sentencaSchema), controller.update);
router.delete('/:id', controller.remove);

// aceita multipart/form-data (arquivo) ou JSON puro ({ texto })
router.post('/:id/analisar', handleUpload, validate(analisarSchema), controller.analisar);

module.exports = router;
