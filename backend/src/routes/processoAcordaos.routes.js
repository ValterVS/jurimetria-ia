const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/acordao.controller');
const { acordaoSchema } = require('../validators/acordao.validator');

// Montado em processo.routes.js como '/:id/acordaos'.
const router = Router({ mergeParams: true });

router.get('/', controller.listByProcesso);
router.post('/', validate(acordaoSchema), controller.create);

module.exports = router;
