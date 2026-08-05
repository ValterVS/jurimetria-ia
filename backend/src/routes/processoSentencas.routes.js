const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/sentenca.controller');
const { sentencaSchema } = require('../validators/sentenca.validator');

// Montado em processo.routes.js como '/:id/sentencas'.
const router = Router({ mergeParams: true });

router.get('/', controller.listByProcesso);
router.post('/', validate(sentencaSchema), controller.create);

module.exports = router;
