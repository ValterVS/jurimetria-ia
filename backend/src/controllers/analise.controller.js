const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const decisionAnalysisService = require('../ai/decisionAnalysisService');

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, 'Análise: id inválido.');
  }
  return id;
}

const getById = asyncHandler(async (req, res) => {
  const analise = await decisionAnalysisService.getAnalysisById(parseId(req.params.id));
  res.json(analise);
});

module.exports = { getById };
