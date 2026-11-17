const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const controller = require('../controllers/auth.controller');
const {
  cadastroSchema,
  verificarEmailSchema,
  reenviarCodigoSchema,
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
} = require('../validators/auth.validator');

// limite mais estrito nas rotas de autenticação, para dificultar força bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.use(authLimiter);

router.post('/cadastro', validate(cadastroSchema), controller.cadastrar);
router.post('/verificar-email', validate(verificarEmailSchema), controller.verificarEmail);
router.post('/reenviar-codigo', validate(reenviarCodigoSchema), controller.reenviarCodigo);
router.post('/login', validate(loginSchema), controller.login);
router.post('/esqueci-senha', validate(esqueciSenhaSchema), controller.esqueciSenha);
router.post('/redefinir-senha', validate(redefinirSenhaSchema), controller.redefinirSenha);
router.get('/me', requireAuth, controller.me);

module.exports = router;
