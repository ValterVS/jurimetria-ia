// Agregador de rotas da API.
const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');

const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');
const processoRoutes = require('./processo.routes');
const parteRoutes = require('./parte.routes');
const pedidoRoutes = require('./pedido.routes');
const sentencaRoutes = require('./sentenca.routes');
const acordaoRoutes = require('./acordao.routes');
const analiseRoutes = require('./analise.routes');
const jurimetriaRoutes = require('./jurimetria.routes');
const dashboardRoutes = require('./dashboard.routes');

const tribunalRoutes = require('./cadastros/tribunal.routes');
const comarcaRoutes = require('./cadastros/comarca.routes');
const varaRoutes = require('./cadastros/vara.routes');
const juizRoutes = require('./cadastros/juiz.routes');
const desembargadorRoutes = require('./cadastros/desembargador.routes');
const ministroRoutes = require('./cadastros/ministro.routes');
const tipoParteRoutes = require('./cadastros/tipoParte.routes');
const tipoSentencaRoutes = require('./cadastros/tipoSentenca.routes');
const tipoAcordaoRoutes = require('./cadastros/tipoAcordao.routes');
const situacaoProcessoRoutes = require('./cadastros/situacaoProcesso.routes');

const router = Router();

// rotas públicas (sem autenticação)
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

// a partir daqui, toda rota exige uma empresa autenticada (req.empresa)
router.use(requireAuth);

router.use('/processos', processoRoutes);
router.use('/partes', parteRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/sentencas', sentencaRoutes);
router.use('/acordaos', acordaoRoutes);
router.use('/analises', analiseRoutes);
router.use('/jurimetria', jurimetriaRoutes);
router.use('/dashboard', dashboardRoutes);

router.use('/tribunais', tribunalRoutes);
router.use('/comarcas', comarcaRoutes);
router.use('/varas', varaRoutes);
router.use('/juizes', juizRoutes);
router.use('/desembargadores', desembargadorRoutes);
router.use('/ministros', ministroRoutes);
router.use('/tipos-parte', tipoParteRoutes);
router.use('/tipos-sentenca', tipoSentencaRoutes);
router.use('/tipos-acordao', tipoAcordaoRoutes);
router.use('/situacoes-processo', situacaoProcessoRoutes);

module.exports = router;
