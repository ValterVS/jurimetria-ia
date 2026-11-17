const asyncHandler = require('../utils/asyncHandler');
const jurimetriaService = require('../services/jurimetria.service');

const resumo = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getResumo(req.query, req.empresa.id_empresa);
  res.json(dados);
});

const pedidos = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorPedido(req.query, req.empresa.id_empresa);
  res.json(dados);
});

const julgadores = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorJulgador(req.query, req.empresa.id_empresa);
  res.json(dados);
});

const juizes = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getJuizesPorPedido(req.query, req.empresa.id_empresa);
  res.json(dados);
});

const desembargadores = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getDesembargadoresPorPedido(req.query, req.empresa.id_empresa);
  res.json(dados);
});

const tribunais = asyncHandler(async (req, res) => {
  const dados = await jurimetriaService.getPorTribunal(req.query, req.empresa.id_empresa);
  res.json(dados);
});

module.exports = { resumo, pedidos, julgadores, juizes, desembargadores, tribunais };
