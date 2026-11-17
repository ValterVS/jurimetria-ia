const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const dashboard = asyncHandler(async (req, res) => {
  res.json(await dashboardService.getDashboard(req.empresa.id_empresa));
});

module.exports = { dashboard };
