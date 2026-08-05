const { Router } = require('express');
const validate = require('../middlewares/validate');
const controller = require('../controllers/jurimetria.controller');
const { jurimetriaFiltersSchema } = require('../validators/jurimetria.validator');

const router = Router();

router.get('/resumo', validate(jurimetriaFiltersSchema, 'query'), controller.resumo);
router.get('/pedidos', validate(jurimetriaFiltersSchema, 'query'), controller.pedidos);
router.get('/julgadores', validate(jurimetriaFiltersSchema, 'query'), controller.julgadores);
router.get('/tribunais', validate(jurimetriaFiltersSchema, 'query'), controller.tribunais);

module.exports = router;
