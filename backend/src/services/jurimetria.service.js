const jurimetriaRepository = require('../repositories/jurimetria.repository');

// Percentuais sempre calculados aqui, a partir das contagens do Postgres -
// a IA nunca participa deste cálculo.
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

async function getResumo(filters, idEmpresa) {
  const bruto = await jurimetriaRepository.getResumo({ ...filters, id_empresa: idEmpresa });

  return {
    total_processos: bruto.totalProcessos.total_processos,
    valor_total_causas: Number(bruto.totalProcessos.valor_total_causas),
    pedidos: {
      ...comPercentuais(bruto.pedidos),
      // dos pedidos que chegaram ao 2º grau, quantos tiveram o resultado da sentença mudado
      percentual_reforma:
        bruto.pedidos.pedidos_segundo_grau > 0
          ? Math.round((bruto.pedidos.pedidos_reformados / bruto.pedidos.pedidos_segundo_grau) * 1000) / 10
          : null,
    },
    reformas_segundo_grau: bruto.reformas,
    por_periodo: bruto.porPeriodo.map(comPercentuais),
    pedido_selecionado: bruto.pedidoSelecionado ?? null,
  };
}

async function getPorPedido(filters, idEmpresa) {
  const rows = await jurimetriaRepository.getPorPedido({ ...filters, id_empresa: idEmpresa });
  return rows.map((row) => ({
    ...comPercentuais(row),
    valor_medio: row.valor_medio === null ? null : Number(row.valor_medio),
  }));
}

async function getPorJulgador(filters, idEmpresa) {
  const { porJuiz, porDesembargador } = await jurimetriaRepository.getPorJulgador({ ...filters, id_empresa: idEmpresa });
  return {
    por_juiz: porJuiz.map(comPercentuais),
    por_desembargador: porDesembargador.map(comPercentuais),
  };
}

// Percentuais sobre o total de pedidos do julgador, incluindo "sem resultado"
// (quando o resultado não foi identificado).
function percentuaisDoJuiz({ total, procedentes, improcedentes, parciais, sem_resultado }) {
  if (!total) {
    return { percentual_procedente: 0, percentual_improcedente: 0, percentual_parcial: 0, percentual_sem_resultado: 0 };
  }
  const pct = (n) => Math.round((n / total) * 1000) / 10;
  return {
    percentual_procedente: pct(procedentes),
    percentual_improcedente: pct(improcedentes),
    percentual_parcial: pct(parciais),
    percentual_sem_resultado: pct(sem_resultado),
  };
}

// Mínimo de pedidos decididos para tratar o percentual como indicativo.
const AMOSTRA_MINIMA = 5;

const ROTULO_RESULTADO = {
  procedente: 'procedente',
  improcedente: 'improcedente',
  parcialmente_procedente: 'parcialmente_procedente',
};

// "Chance" histórica: percentual sobre os pedidos que TÊM resultado (os sem
// resultado não entram na conta). `tendencia` é o resultado mais frequente
// (null se não há pedidos decididos ou se há empate no topo).
function chancesDoJulgador({ procedentes, improcedentes, parciais }) {
  const decididos = procedentes + improcedentes + parciais;
  const pct = (n) => (decididos ? Math.round((n / decididos) * 1000) / 10 : 0);

  const contagens = [
    ['procedente', procedentes],
    ['improcedente', improcedentes],
    ['parcialmente_procedente', parciais],
  ].sort((a, b) => b[1] - a[1]);
  const empate = contagens[0][1] === contagens[1][1];

  return {
    decididos,
    chance_procedente: pct(procedentes),
    chance_improcedente: pct(improcedentes),
    chance_parcial: pct(parciais),
    tendencia: decididos && !empate ? ROTULO_RESULTADO[contagens[0][0]] : null,
    amostra_pequena: decididos < AMOSTRA_MINIMA,
  };
}

function agruparFundamentos(rows) {
  const mapa = new Map();
  for (const row of rows) {
    const chave = `${row.id_julgador}:${row.id_pedido}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push({ resultado: row.resultado, texto: row.fundamentacao });
  }
  return mapa;
}

// Agrupa as linhas (julgador x pedido) em um resumo por julgador, com o
// detalhe de cada pedido julgado - base do dashboard de tendência. Para
// desembargadores as linhas trazem também "reformados". `fundamentos` é um
// Map "idJulgador:idPedido" -> exemplos de fundamentação (opcional).
function agruparPorJulgador(rows, { idKey, nomeKey }, fundamentos = new Map()) {
  const mapa = new Map();
  const campos = ['total', 'procedentes', 'improcedentes', 'parciais', 'sem_resultado'];

  for (const row of rows) {
    const comReformados = row.reformados !== undefined;
    if (!mapa.has(row[idKey])) {
      mapa.set(row[idKey], {
        [idKey]: row[idKey],
        [nomeKey]: row[nomeKey],
        total: 0,
        procedentes: 0,
        improcedentes: 0,
        parciais: 0,
        sem_resultado: 0,
        ...(comReformados ? { reformados: 0 } : {}),
        pedidos: [],
      });
    }
    const julgador = mapa.get(row[idKey]);
    for (const campo of campos) julgador[campo] += row[campo];
    if (comReformados) julgador.reformados += row.reformados;

    julgador.pedidos.push({
      id_pedido: row.id_pedido,
      nome_pedido: row.nome_pedido,
      total: row.total,
      procedentes: row.procedentes,
      improcedentes: row.improcedentes,
      parciais: row.parciais,
      sem_resultado: row.sem_resultado,
      ...(comReformados ? { reformados: row.reformados } : {}),
      ...percentuaisDoJuiz(row),
      ...chancesDoJulgador(row),
      fundamentos: fundamentos.get(`${row[idKey]}:${row.id_pedido}`) || [],
    });
  }

  return [...mapa.values()]
    .map((j) => ({
      ...j,
      ...percentuaisDoJuiz(j),
      ...chancesDoJulgador(j),
      // pedidos com mais decisões primeiro: são os que têm base estatística
      pedidos: [...j.pedidos].sort((a, b) => b.decididos - a.decididos || a.nome_pedido.localeCompare(b.nome_pedido)),
    }))
    .sort((a, b) => b.total - a.total || a[nomeKey].localeCompare(b[nomeKey]));
}

function agruparPorJuiz(rows, fundamentos) {
  return agruparPorJulgador(rows, { idKey: 'id_juiz', nomeKey: 'nome_juiz' }, fundamentos);
}

function agruparPorDesembargador(rows, fundamentos) {
  return agruparPorJulgador(rows, { idKey: 'id_desembargador', nomeKey: 'nome_desembargador' }, fundamentos);
}

async function getJuizesPorPedido(filters, idEmpresa) {
  const filtros = { ...filters, id_empresa: idEmpresa };
  const [rows, fundamentos] = await Promise.all([
    jurimetriaRepository.getJuizesPorPedido(filtros),
    jurimetriaRepository.getFundamentosJuizes(filtros),
  ]);
  return agruparPorJuiz(rows, agruparFundamentos(fundamentos));
}

async function getDesembargadoresPorPedido(filters, idEmpresa) {
  const filtros = { ...filters, id_empresa: idEmpresa };
  const [rows, fundamentos] = await Promise.all([
    jurimetriaRepository.getDesembargadoresPorPedido(filtros),
    jurimetriaRepository.getFundamentosDesembargadores(filtros),
  ]);
  return agruparPorDesembargador(rows, agruparFundamentos(fundamentos));
}

async function getPorTribunal(filters, idEmpresa) {
  const { porTribunal, porComarca, porVara } = await jurimetriaRepository.getPorTribunal({ ...filters, id_empresa: idEmpresa });
  return {
    por_tribunal: porTribunal.map(comPercentuais),
    por_comarca: porComarca.map(comPercentuais),
    por_vara: porVara.map(comPercentuais),
  };
}

// calcularPercentuais também exportadas para teste isolado
module.exports = {
  getResumo,
  getPorPedido,
  getPorJulgador,
  getJuizesPorPedido,
  getDesembargadoresPorPedido,
  getPorTribunal,
  calcularPercentuais,
  agruparPorJuiz,
  agruparPorDesembargador,
  chancesDoJulgador,
};
