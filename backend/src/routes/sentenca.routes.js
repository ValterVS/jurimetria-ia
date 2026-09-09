const { Router } = require('express');
const validate = require('../middlewares/validate');
const { handleUpload } = require('../middlewares/upload');
const controller = require('../controllers/sentenca.controller');
const { sentencaSchema } = require('../validators/sentenca.validator');
const { analisarSchema } = require('../validators/analiseDecisao.validator');

// Acesso direto por id.
const router = Router();

router.get('/:id', controller.getById);
router.put('/:id', validate(sentencaSchema), controller.update);
router.delete('/:id', controller.remove);

// multipart/form-data (arquivo opcional, campo "arquivo") ou JSON puro
// ({ texto }) - handleUpload só atua quando o content-type é multipart.
router.post('/:id/analisar', handleUpload, validate(analisarSchema), controller.analisar);

module.exports = router;
