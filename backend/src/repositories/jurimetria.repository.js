const pool = require('../config/db');

// Todas as consultas de jurimetria partem de `processos` (alias `p`),
// que já guarda diretamente id_tribunal/id_comarca/id_vara/id_juiz/
// id_desembargador/id_ministro/id_situacao - por isso os filtros abaixo
// não precisam navegar por sentenca/acordao na maioria dos casos.
//
// Nomes de tabela/coluna usados nas queries são sempre fixos, definidos
// no código; valores de filtro sempre vão por parâmetro posicional ($1,
// $2...), nunca por concatenação de string.

function buildProcessoWhere(filters, alias = 'p') {
  const conditions = [];
  const params = [];

  const add = (column, value, operator = '=') => {
    if (value === undefined || value === null || value === '') return;
    params.push(value);
    conditions.push(`${alias}.${column} ${operator} $${params.length}`);
  };

  add('id_tribunal', filters.id_tribunal);
  add('id_comarca', filters.id_comarca);
  add('id_vara', filters.id_vara);
  add('id_juiz', filters.id_juiz);
  add('id_desembargador', filters.id_desembargador);
  add('id_situacao', filters.id_situacao);
  add('data_distribuicao', filters.data_inicio, '>=');
  add('data_distribuicao', filters.data_fim, '<=');

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

// Filtro opcional por pedido, aplicado na condição do JOIN com
// processo_pedidos (não no WHERE), para não transformar LEFT JOINs em
// INNER JOINs "sem querer" quando não há pedido daquele tipo vinculado.
function buildPedidoJoinExtra(filters, params) {
  if (filters.id_pedido === undefined || filters.id_pedido === null) {
    return { pedidoJoinExtra: '', params };
  }
  params.push(filters.id_pedido);
  return { pedidoJoinExtra: `AND pp.id_pedido = $${params.length}`, params };
}

const RESULTADO_COUNTS_SQL = `
  COUNT(pp.resultado)::int AS total_analisados,
  COUNT(*) FILTER (WHERE pp.resultado = 'procedente')::int AS procedentes,
  COUNT(*) FILTER (WHERE pp.resultado = 'improcedente')::int AS improcedentes,
  COUNT(*) FILTER (WHERE pp.resultado = 'parcialmente_procedente')::int AS parciais
`;

// Agregação genérica "processos agrupados por uma dimensão institucional"
// (tribunal, comarca, vara, juiz ou desembargador). table/idColumn/
// nameColumn/processoColumn são sempre valores fixos vindos do código
// (nunca de input do usuário - ver getPorJulgador/getPorTribunal abaixo).
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
  const { whereClause, params } = buildProcessoWhere(filters);

  const totalProcessosPromise = pool.query(
    `SELECT COUNT(*)::int AS total_processos, COALESCE(SUM(p.valor_causa), 0)::numeric AS valor_total_causas
     FROM processos p ${whereClause}`,
    params
  );

  const porSituacaoPromise = pool.query(
    `SELECT sp.id_situacao, sp.nome_situacao, COUNT(fp.id_processo)::int AS total
     FROM situacao_processo sp
     LEFT JOIN (SELECT id_processo, id_situacao FROM processos p ${whereClause}) fp
       ON fp.id_situacao = sp.id_situacao
     GROUP BY sp.id_situacao, sp.nome_situacao
     ORDER BY sp.nome_situacao ASC`,
    params
  );

  const analisesPromise = pool.query(
    `SELECT sa.tipo_analise AS status, COUNT(*)::int AS total
     FROM analise_decisao ad
     JOIN status_analise sa ON sa.id_status_analise = ad.id_status_analise
     WHERE ad.id_analise IN (
       SELECT s.id_analise FROM sentenca s JOIN processos p ON p.id_processo = s.id_processo
         WHERE s.id_analise IS NOT NULL ${whereClause ? 'AND ' + whereClause.slice(6) : ''}
       UNION
       SELECT a.id_analise FROM acordao a JOIN processos p ON p.id_processo = a.id_processo
         WHERE a.id_analise IS NOT NULL ${whereClause ? 'AND ' + whereClause.slice(6) : ''}
     )
     GROUP BY sa.tipo_analise`,
    // O mesmo texto de whereClause (e os mesmos placeholders $1, $2...) é
    // usado nos dois ramos do UNION dentro da MESMA query, então os
    // parâmetros são passados uma única vez - o Postgres substitui o
    // valor de cada $n em todas as ocorrências dele no texto.
    params
  );

  const pedidosPromise = pool.query(
    `SELECT
       COUNT(*)::int AS total_vinculados,
       ${RESULTADO_COUNTS_SQL}
     FROM processo_pedidos pp
     JOIN processos p ON p.id_processo = pp.id_processo
     ${whereClause}`,
    params
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

  // Agrupamento temporal por mês de distribuição do processo
  // (processos.data_distribuicao) - não pela data da decisão, para
  // evitar ambiguidade quando um processo tem múltiplas sentenças/
  // acórdãos. Ver comentário no jurimetria.service.js.
  const porPeriodoPromise = pool.query(
    `SELECT
       to_char(date_trunc('month', p.data_distribuicao), 'YYYY-MM') AS periodo,
       ${RESULTADO_COUNTS_SQL}
     FROM processos p
     LEFT JOIN processo_pedidos pp ON pp.id_processo = p.id_processo
     ${whereClause}
     GROUP BY 1
     ORDER BY 1`,
    params
  );

  const [totalProcessos, porSituacao, analises, pedidos, reformas, porPeriodo] = await Promise.all([
    totalProcessosPromise,
    porSituacaoPromise,
    analisesPromise,
    pedidosPromise,
    reformasPromise,
    porPeriodoPromise,
  ]);

  return {
    totalProcessos: totalProcessos.rows[0],
    porSituacao: porSituacao.rows,
    analises: analises.rows,
    pedidos: pedidos.rows[0],
    reformas: reformas.rows[0],
    porPeriodo: porPeriodo.rows,
  };
}

async function getPorPedido(filters) {
  const { whereClause, params } = buildProcessoWhere(filters);

  const { rows } = await pool.query(
    `SELECT
       pe.id_pedido AS id, pe.nome_pedido AS nome,
       COUNT(*)::int AS total_vinculados,
       ${RESULTADO_COUNTS_SQL},
       ROUND(AVG(pp.valor) FILTER (WHERE pp.valor IS NOT NULL)::numeric, 2) AS valor_medio
     FROM processo_pedidos pp
     JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
     JOIN processos p ON p.id_processo = pp.id_processo
     ${whereClause}
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

module.exports = { getResumo, getPorPedido, getPorJulgador, getPorTribunal };
