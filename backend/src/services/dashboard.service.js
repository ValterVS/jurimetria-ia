const dashboardRepository = require('../repositories/dashboard.repository');

async function getDashboard(idEmpresa) {
  const [totais, porCategoria, porSituacao, topPedidos, condenacao] = await Promise.all([
    dashboardRepository.getTotais(idEmpresa),
    dashboardRepository.getPorCategoria(idEmpresa),
    dashboardRepository.getPorSituacao(idEmpresa),
    dashboardRepository.getTopPedidos(idEmpresa, 10),
    dashboardRepository.getCondenacao(idEmpresa),
  ]);

  return {
    total_processos: totais.total_processos,
    valor_total_causas: Number(totais.valor_total_causas),
    valor_total_condenacao: Number(condenacao.valor_total_condenacao),
    // valor da causa menos condenação, só onde a condenação foi identificada
    valor_total_beneficio: Number(condenacao.valor_total_beneficio),
    processos_com_condenacao: condenacao.processos_com_condenacao,
    processos_por_categoria: porCategoria,
    processos_por_situacao: porSituacao,
    top_pedidos: topPedidos,
  };
}

module.exports = { getDashboard };
