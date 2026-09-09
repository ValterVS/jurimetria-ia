const jurimetriaRepository = require('../repositories/jurimetria.repository');

// Os percentuais são SEMPRE calculados aqui no backend, a partir das
// contagens vindas do PostgreSQL - a IA nunca participa deste cálculo
// (ver seção 17 do escopo: IA faz análise semântica por documento,
// sistema faz estatística agregada).
function calcularPercentuais({ total_analisados, procedentes, improcedentes, parciais }) {
  if (!total_analisados) {
    return { percentual_procedencia: 0, percentual_improcedencia: 0, percentual_parcial: 0 };
  }
  const pct = (n) => Math.round((n / total_analisados) * 1000) / 10; // 1 casa decimal
  return {
    percentual_procedencia: pct(procedentes),
    percentual_improcedencia: pct(improcedentes),
    percentual_parcial: pct(parciais),
  };
}

function comPercentuais(row) {
  return { ...row, ...calcularPercentuais(row) };
}

const STATUS_LABEL_TO_KEY = {
  Pendente: 'pendente',
  'Em Análise': 'em_analise',
  Concluída: 'concluida',
  Erro: 'erro',
};

function normalizarAnalises(rows) {
  const base = { pendente: 0, em_analise: 0, concluida: 0, erro: 0 };
  for (const row of rows) {
    const chave = STATUS_LABEL_TO_KEY[row.status];
    if (chave) base[chave] = row.total;
  }
  base.total = base.pendente + base.em_analise + base.concluida + base.erro;
  return base;
}

async function getResumo(filters) {
  const bruto = await jurimetriaRepository.getResumo(filters);

  return {
    total_processos: bruto.totalProcessos.total_processos,
    valor_total_causas: Number(bruto.totalProcessos.valor_total_causas),
    processos_por_situacao: bruto.porSituacao,
    analises: normalizarAnalises(bruto.analises),
    pedidos: comPercentuais(bruto.pedidos),
    reformas_segundo_grau: bruto.reformas,
    por_periodo: bruto.porPeriodo.map(comPercentuais),
  };
}

async function getPorPedido(filters) {
  const rows = await jurimetriaRepository.getPorPedido(filters);
  return rows.map((row) => ({
    ...comPercentuais(row),
    valor_medio: row.valor_medio === null ? null : Number(row.valor_medio),
  }));
}

async function getPorJulgador(filters) {
  const { porJuiz, porDesembargador } = await jurimetriaRepository.getPorJulgador(filters);
  return {
    por_juiz: porJuiz.map(comPercentuais),
    por_desembargador: porDesembargador.map(comPercentuais),
  };
}

async function getPorTribunal(filters) {
  const { porTribunal, porComarca, porVara } = await jurimetriaRepository.getPorTribunal(filters);
  return {
    por_tribunal: porTribunal.map(comPercentuais),
    por_comarca: porComarca.map(comPercentuais),
    por_vara: porVara.map(comPercentuais),
  };
}

// calcularPercentuais e normalizarAnalises também são exportadas (além
// das 4 funções que os endpoints realmente usam) só para permitir testar
// isoladamente a matemática dos percentuais, sem precisar de um Postgres
// de verdade - ver tests/unit/jurimetria.service.test.js.
module.exports = { getResumo, getPorPedido, getPorJulgador, getPorTribunal, calcularPercentuais, normalizarAnalises };
