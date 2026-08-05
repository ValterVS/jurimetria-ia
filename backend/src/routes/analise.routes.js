const { Router } = require('express');
const controller = require('../controllers/analise.controller');

// GET /api/analises/:id - usado pelo frontend para fazer polling do
// status (Pendente -> Em Análise -> Concluída/Erro) enquanto a análise
// roda em segundo plano.
const router = Router();

router.get('/:id', controller.getById);

module.exports = router;
