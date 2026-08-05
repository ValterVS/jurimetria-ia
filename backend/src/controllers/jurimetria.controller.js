const asyncHandler = require('../utils/asyncHandler');
const jurimetriaService = require('../services/jurimetria.service');

const resumo = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getResumo(req.query);
  res.json(dados);
});

const pedidos = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorPedido(req.query);
  res.json(dados);
});

const julgadores = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorJulgador(req.query);
  res.json(dados);
});

const tribunais = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorTribunal(req.query);
  res.json(dados);
});

module.exports = { resumo, pedidos, julgadores, tribunais };
