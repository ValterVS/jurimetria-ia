const pool = require('../config/db');

// Nomes de tabela/coluna são sempre fixos no código; valores de filtro
// sempre vão por parâmetro posicional ($1, $2...).

function buildProcessoWhere(filters, alias = 'p') {
  const conditions = [];
  const params = [];

  const add = (column, value, operator = '=') => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    conditions.push(`${alias}.${column} ${operator} $${params.length}`);
  };

  // id_empresa é sempre injetado pelo service a partir da empresa logada
  add('id_empresa', filters.id_empresa);
  add('id_tribunal', filters.id_tribunal);
  add('id_comarca', filters.id_comarca);
  add('id_vara', filters.id_vara);
  add('id_situacao', filters.id_situacao);
  add('data_distribuicao', filters.data_inicio, '>=');
  add('data_distribuicao', filters.data_fim, '<=');

  // Juiz/desembargador: o processo conta se o julgador atuou nele - ou pelo
  // cadastro do processo, ou por uma sentença/acórdão dele.
  if (filters.id_juiz) {
    params.push(filters.id_juiz);
    const n = params.length;
    conditions.push(
      `(${alias}.id_juiz = $${n} OR EXISTS (SELECT 1 FROM sentenca sj WHERE sj.id_processo = ${alias}.id_processo AND sj.id_juiz = $${n}))`
    );
  }
  if (filters.id_desembargador) {
    params.push(filters.id_desembargador);
    const n = params.length;
    conditions.push(
      `(${alias}.id_desembargador = $${n} OR EXISTS (SELECT 1 FROM acordao ac WHERE ac.id_processo = ${alias}.id_processo AND $${n} IN (ac.id_relator, ac.id_desembargador1, ac.id_desembargador2)))`
    );
  }

  return { whereClause: toWhere(conditions), params, conditions };
}

function toWhere(conditions) {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Nas estatísticas de pedido, juiz/desembargador valem sobre o PEDIDO: só
// entram os pedidos que o julgador decidiu, contados pelo resultado da
// instância dele (sentença para o juiz, acórdão para o desembargador). Sem
// esses filtros, vale o resultado atual (o acórdão prevalece sobre a sentença).
function buildPedidoScope(filters, params) {
  const conditions = [];
  let coluna = 'pp.resultado';

  if (filters.id_pedido) {
    params.push(filters.id_pedido);
    conditions.push(`pp.id_pedido = $${params.length}`);
  }
  if (filters.id_juiz) {
    params.push(filters.id_juiz);
    conditions.push(`pp.id_juiz = $${params.length}`);
    coluna = 'pp.resultado_sentenca';
  }
  if (filters.id_desembargador) {
    params.push(filters.id_desembargador);
    conditions.push(`pp.id_desembargador = $${params.length}`);
    coluna = filters.id_juiz ? 'pp.resultado' : 'pp.resultado_acordao';
  }
  return { conditions, coluna };
}

// Filtro opcional por pedido, aplicado no JOIN (não no WHERE) para não
// transformar LEFT JOINs em INNER JOINs sem querer.
function buildPedidoJoinExtra(filters, params) {
  if (filters.id_pedido === undefined || filters.id_pedido === null) {
    return { pedidoJoinExtra: '', params };
  }
  params.push(filters.id_pedido);
  return { pedidoJoinExtra: `AND pp.id_pedido = $${params.length}`, params };
}

// `coluna` é sempre uma constante do código (nunca input do usuário)
function resultadoCounts(coluna = 'pp.resultado') {
  return `
  COUNT(${coluna})::int AS total_analisados,
  COUNT(*) FILTER (WHERE ${coluna} = 'procedente')::int AS procedentes,
  COUNT(*) FILTER (WHERE ${coluna} = 'improcedente')::int AS improcedentes,
  COUNT(*) FILTER (WHERE ${coluna} = 'parcialmente_procedente')::int AS parciais
`;
}

const RESULTADO_COUNTS_SQL = resultadoCounts();

// Agregação genérica por dimensão institucional (tribunal, comarca, vara,
// juiz ou desembargador).
async function aggregateByDimension({ table, idColumn, nameColumn, processoColumn, whereClause, params, pedidoJoinExtra }) {
  const sql = `
    SELECT
      dim.${idColumn} AS id, dim.${nameColumn} AS nome,
      COUNT(DISTINCT p.id_processo)::int AS total_processos,
      ${RESULTADO_COUNTS_SQL}
    FROM processos p
    JOIN ${table} dim ON dim.${idColumn} = p.${processoColumn}
    LEFT JOIN processo_pedidos pp ON pp.id_processo = p.id_processo ${pedidoJoinExtra}
    ${whereClause}
    GROUP BY dim.${idColumn}, dim.${nameColumn}
    ORDER BY total_analisados DESC, nome ASC
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getResumo(filters) {
  const { whereClause, params, conditions } = buildProcessoWhere(filters);

  const totalProcessosPromise = pool.query(
    `SELECT COUNT(*)::int AS total_processos, COALESCE(SUM(p.valor_causa), 0)::numeric AS valor_total_causas
     FROM processos p ${whereClause}`,
    params
  );

  // os parâmetros do escopo de pedido são acrescentados em cópia, para não
  // alterar a numeração usada pelas demais queries
  const pedidosParams = [...params];
  const escopo = buildPedidoScope(filters, pedidosParams);
  const pedidosPromise = pool.query(
    `SELECT
       COUNT(*)::int AS total_vinculados,
       ${resultadoCounts(escopo.coluna)},
       COUNT(*) FILTER (WHERE pp.reformado IS NOT NULL)::int AS pedidos_segundo_grau,
       COUNT(*) FILTER (WHERE pp.reformado = true)::int AS pedidos_reformados
     FROM processo_pedidos pp
     JOIN processos p ON p.id_processo = pp.id_processo
     ${toWhere([...conditions, ...escopo.conditions])}`,
    pedidosParams
  );

  const reformasPromise = pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE a.reforma_sentenca = true)::int AS reformadas,
       COUNT(*) FILTER (WHERE a.reforma_sentenca = false)::int AS mantidas,
       COUNT(*) FILTER (WHERE a.reforma_sentenca IS NULL)::int AS nao_informado,
       COUNT(*)::int AS total_acordaos
     FROM acordao a
     JOIN processos p ON p.id_processo = a.id_processo
     ${whereClause}`,
    params
  );

  // agrupamento por mês de distribuição do processo, não da decisão
  const periodoParams = [...params];
  const escopoPeriodo = buildPedidoScope(filters, periodoParams);
  const joinPedido = escopoPeriodo.conditions.map((c) => `AND ${c}`).join(' ');
  const porPeriodoPromise = pool.query(
    `SELECT
       to_char(date_trunc('month', p.data_distribuicao), 'YYYY-MM') AS periodo,
       ${resultadoCounts(escopoPeriodo.coluna)}
     FROM processos p
     LEFT JOIN processo_pedidos pp ON pp.id_processo = p.id_processo ${joinPedido}
     ${whereClause}
     GROUP BY 1
     ORDER BY 1`,
    periodoParams
  );

  // nome do pedido filtrado, para o título do gráfico do resumo
  const pedidoSelecionadoPromise = filters.id_pedido
    ? pool.query('SELECT id_pedido, nome_pedido FROM pedidos WHERE id_pedido = $1', [filters.id_pedido])
    : Promise.resolve({ rows: [] });

  const [totalProcessos, pedidos, reformas, porPeriodo, pedidoSelecionado] = await Promise.all([
    totalProcessosPromise,
    pedidosPromise,
    reformasPromise,
    porPeriodoPromise,
    pedidoSelecionadoPromise,
  ]);

  return {
    totalProcessos: totalProcessos.rows[0],
    pedidos: pedidos.rows[0],
    reformas: reformas.rows[0],
    porPeriodo: porPeriodo.rows,
    pedidoSelecionado: pedidoSelecionado.rows[0] || null,
  };
}

async function getPorPedido(filters) {
  const { params, conditions } = buildProcessoWhere(filters);
  const escopo = buildPedidoScope(filters, params);

  const { rows } = await pool.query(
    `SELECT
       pe.id_pedido AS id, pe.nome_pedido AS nome,
       COUNT(*)::int AS total_vinculados,
       ${resultadoCounts(escopo.coluna)},
       ROUND(AVG(pp.valor) FILTER (WHERE pp.valor IS NOT NULL)::numeric, 2) AS valor_medio
     FROM processo_pedidos pp
     JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
     JOIN processos p ON p.id_processo = pp.id_processo
     ${toWhere([...conditions, ...escopo.conditions])}
     GROUP BY pe.id_pedido, pe.nome_pedido
     ORDER BY total_analisados DESC, pe.nome_pedido ASC`,
    params
  );
  return rows;
}

async function getPorJulgador(filters) {
  const { whereClause, params } = buildProcessoWhere(filters);
  const { pedidoJoinExtra } = buildPedidoJoinExtra(filters, params);

  const [porJuiz, porDesembargador] = await Promise.all([
    aggregateByDimension({
      table: 'juiz',
      idColumn: 'id_juiz',
      nameColumn: 'nome_juiz',
      processoColumn: 'id_juiz',
      whereClause,
      params,
      pedidoJoinExtra,
    }),
    aggregateByDimension({
      table: 'desembargador',
      idColumn: 'id_desembargador',
      nameColumn: 'nome_desembargador',
      processoColumn: 'id_desembargador',
      whereClause,
      params,
      pedidoJoinExtra,
    }),
  ]);

  return { porJuiz, porDesembargador };
}

// Resultados de cada pedido, separados por julgador. Cada instância guarda o
// seu próprio registro em processo_pedidos, então o histórico do julgador
// não se mistura com o do outro grau:
//  - juiz (1º grau): pp.id_juiz + pp.resultado_sentenca
//  - desembargador (2º grau, relator do acórdão): pp.id_desembargador +
//    pp.resultado_acordao, com a contagem de pedidos em que reformou a sentença
// "sem_resultado" = pedido do julgador cujo resultado ficou em branco.
// Nos filtros, o id do julgador e id_pedido valem sobre o pedido (pp).
function buildJulgadorWhere(filters, { filtroJulgador, ppIdColuna }) {
  const { whereClause, params } = buildProcessoWhere({ ...filters, id_juiz: undefined, id_desembargador: undefined });
  const conditions = whereClause ? [whereClause.slice(6)] : [];

  const addPedidoCondition = (column, value) => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    conditions.push(`pp.${column} = $${params.length}`);
  };
  addPedidoCondition(ppIdColuna, filters[filtroJulgador]);
  addPedidoCondition('id_pedido', filters.id_pedido);

  return { where: toWhere(conditions), params };
}

async function getResultadosPorJulgador(filters, config) {
  const { tabela, idColuna, nomeColuna, ppIdColuna, ppResultadoColuna, comReformados } = config;
  const { where, params } = buildJulgadorWhere(filters, config);
  const reformados = comReformados
    ? ",\n       COUNT(*) FILTER (WHERE pp.reformado = true)::int AS reformados"
    : '';

  const { rows } = await pool.query(
    `SELECT
       j.${idColuna}, j.${nomeColuna},
       pe.id_pedido, pe.nome_pedido,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE pp.${ppResultadoColuna} = 'procedente')::int AS procedentes,
       COUNT(*) FILTER (WHERE pp.${ppResultadoColuna} = 'improcedente')::int AS improcedentes,
       COUNT(*) FILTER (WHERE pp.${ppResultadoColuna} = 'parcialmente_procedente')::int AS parciais,
       COUNT(*) FILTER (WHERE pp.${ppResultadoColuna} IS NULL)::int AS sem_resultado${reformados}
     FROM processo_pedidos pp
     JOIN processos p ON p.id_processo = pp.id_processo
     JOIN ${tabela} j ON j.${idColuna} = pp.${ppIdColuna}
     JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
     ${where}
     GROUP BY j.${idColuna}, j.${nomeColuna}, pe.id_pedido, pe.nome_pedido
     ORDER BY j.${nomeColuna} ASC, total DESC, pe.nome_pedido ASC`,
    params
  );
  return rows;
}

// Exemplos de fundamentação ("por que decidiu assim"): até `porGrupo` mais
// recentes por julgador + pedido + resultado.
async function getFundamentosPorJulgador(filters, config, porGrupo = 3) {
  const { ppIdColuna, ppResultadoColuna, ppFundamentacaoColuna } = config;
  const { where, params } = buildJulgadorWhere(filters, config);
  const extra = `pp.${ppResultadoColuna} IS NOT NULL AND pp.${ppFundamentacaoColuna} IS NOT NULL`;
  const whereCompleto = where ? `${where} AND ${extra}` : `WHERE ${extra}`;
  params.push(porGrupo);

  const { rows } = await pool.query(
    `SELECT id_julgador, id_pedido, resultado, fundamentacao
     FROM (
       SELECT
         pp.${ppIdColuna} AS id_julgador,
         pp.id_pedido,
         pp.${ppResultadoColuna} AS resultado,
         pp.${ppFundamentacaoColuna} AS fundamentacao,
         ROW_NUMBER() OVER (
           PARTITION BY pp.${ppIdColuna}, pp.id_pedido, pp.${ppResultadoColuna}
           ORDER BY pp.id_processo_pedido DESC
         ) AS posicao
       FROM processo_pedidos pp
       JOIN processos p ON p.id_processo = pp.id_processo
       ${whereCompleto}
     ) f
     WHERE f.posicao <= $${params.length}
     ORDER BY id_julgador, id_pedido, resultado`,
    params
  );
  return rows;
}

const CONFIG_JUIZ = {
  filtroJulgador: 'id_juiz',
  tabela: 'juiz',
  idColuna: 'id_juiz',
  nomeColuna: 'nome_juiz',
  ppIdColuna: 'id_juiz',
  ppResultadoColuna: 'resultado_sentenca',
  ppFundamentacaoColuna: 'fundamentacao_sentenca',
  comReformados: false,
};

const CONFIG_DESEMBARGADOR = {
  filtroJulgador: 'id_desembargador',
  tabela: 'desembargador',
  idColuna: 'id_desembargador',
  nomeColuna: 'nome_desembargador',
  ppIdColuna: 'id_desembargador',
  ppResultadoColuna: 'resultado_acordao',
  ppFundamentacaoColuna: 'fundamentacao_acordao',
  comReformados: true,
};

function getJuizesPorPedido(filters) {
  return getResultadosPorJulgador(filters, CONFIG_JUIZ);
}

function getDesembargadoresPorPedido(filters) {
  return getResultadosPorJulgador(filters, CONFIG_DESEMBARGADOR);
}

function getFundamentosJuizes(filters) {
  return getFundamentosPorJulgador(filters, CONFIG_JUIZ);
}

function getFundamentosDesembargadores(filters) {
  return getFundamentosPorJulgador(filters, CONFIG_DESEMBARGADOR);
}

async function getPorTribunal(filters) {
  const { whereClause, params } = buildProcessoWhere(filters);
  const { pedidoJoinExtra } = buildPedidoJoinExtra(filters, params);

  const [porTribunal, porComarca, porVara] = await Promise.all([
    aggregateByDimension({
      table: 'tribunal',
      idColumn: 'id_tribunal',
      nameColumn: 'nome_tribunal',
      processoColumn: 'id_tribunal',
      whereClause,
      params,
      pedidoJoinExtra,
    }),
    aggregateByDimension({
      table: 'comarca',
      idColumn: 'id_comarca',
      nameColumn: 'nome_comarca',
      processoColumn: 'id_comarca',
      whereClause,
      params,
      pedidoJoinExtra,
    }),
    aggregateByDimension({
      table: 'vara',
      idColumn: 'id_vara',
      nameColumn: 'nome_vara',
      processoColumn: 'id_vara',
      whereClause,
      params,
      pedidoJoinExtra,
    }),
  ]);

  return { porTribunal, porComarca, porVara };
}

module.exports = {
  getResumo,
  getPorPedido,
  getPorJulgador,
  getJuizesPorPedido,
  getDesembargadoresPorPedido,
  getFundamentosJuizes,
  getFundamentosDesembargadores,
  getPorTribunal,
};
