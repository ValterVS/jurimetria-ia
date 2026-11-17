const { Router } = require('express');
const controller = require('../controllers/dashboard.controller');

const router = Router();

router.get('/', controller.dashboard);

module.exports = router;
