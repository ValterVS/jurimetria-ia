const { Router } = require('express');
const controller = require('../controllers/analise.controller');

// GET /api/analises/:id - usado pelo frontend para polling de status
const router = Router();

router.get('/:id', controller.getById);

module.exports = router;
