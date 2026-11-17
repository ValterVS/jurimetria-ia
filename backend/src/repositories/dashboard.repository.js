const pool = require('../config/db');

// Consultas do Dashboard (panorama geral da empresa logada). Todas filtradas
// por id_empresa, sempre por parâmetro.

async function getTotais(idEmpresa) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total_processos,
            COALESCE(SUM(valor_causa), 0)::numeric AS valor_total_causas
     FROM processos
     WHERE id_empresa = $1`,
    [idEmpresa]
  );
  return rows[0];
}

// processos por categoria (tipo de ação); vazio vira "Não informada"
async function getPorCategoria(idEmpresa) {
  const { rows } = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(categoria), ''), 'Não informada') AS categoria,
            COUNT(*)::int AS total
     FROM processos
     WHERE id_empresa = $1
     GROUP BY 1
     ORDER BY total DESC, categoria ASC`,
    [idEmpresa]
  );
  return rows;
}

async function getPorSituacao(idEmpresa) {
  const { rows } = await pool.query(
    `SELECT sp.id_situacao, sp.nome_situacao, COUNT(p.id_processo)::int AS total
     FROM situacao_processo sp
     LEFT JOIN processos p ON p.id_situacao = sp.id_situacao AND p.id_empresa = $1
     GROUP BY sp.id_situacao, sp.nome_situacao
     ORDER BY sp.nome_situacao ASC`,
    [idEmpresa]
  );
  return rows;
}

// Pedidos mais frequentes, contando em quantos processos aparecem.
async function getTopPedidos(idEmpresa, limite = 10) {
  const { rows } = await pool.query(
    `SELECT pe.id_pedido, pe.nome_pedido, COUNT(DISTINCT pp.id_processo)::int AS total_processos
     FROM processo_pedidos pp
     JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
     JOIN processos p ON p.id_processo = pp.id_processo
     WHERE p.id_empresa = $1
     GROUP BY pe.id_pedido, pe.nome_pedido
     ORDER BY total_processos DESC, pe.nome_pedido ASC
     LIMIT $2`,
    [idEmpresa, limite]
  );
  return rows;
}

// Condenação e benefício. O valor de condenação de cada processo vem da
// análise de IA (valores_identificados.valor_condenacao) da decisão mais
// recente que o trouxe: o acórdão prevalece sobre a sentença.
// Benefício = valor da causa - condenação, só nos processos com condenação
// identificada (sem ela, o benefício seria igual ao valor da causa inteiro).
async function getCondenacao(idEmpresa) {
  const { rows } = await pool.query(
    `WITH cond AS (
       SELECT
         p.valor_causa,
         COALESCE(
           (SELECT (ad.insights_json->'valores_identificados'->>'valor_condenacao')::numeric
            FROM acordao a
            JOIN analise_decisao ad ON ad.id_analise = a.id_analise
            WHERE a.id_processo = p.id_processo
              AND ad.insights_json->'valores_identificados'->>'valor_condenacao' IS NOT NULL
            ORDER BY a.data_acordao DESC NULLS LAST, a.id_acordao DESC
            LIMIT 1),
           (SELECT (ad.insights_json->'valores_identificados'->>'valor_condenacao')::numeric
            FROM sentenca s
            JOIN analise_decisao ad ON ad.id_analise = s.id_analise
            WHERE s.id_processo = p.id_processo
              AND ad.insights_json->'valores_identificados'->>'valor_condenacao' IS NOT NULL
            ORDER BY s.id_sentenca DESC
            LIMIT 1)
         ) AS valor_condenacao
       FROM processos p
       WHERE p.id_empresa = $1
     )
     SELECT
       COUNT(*) FILTER (WHERE valor_condenacao IS NOT NULL)::int AS processos_com_condenacao,
       COALESCE(SUM(valor_condenacao), 0)::numeric AS valor_total_condenacao,
       COALESCE(SUM(valor_causa - valor_condenacao)
         FILTER (WHERE valor_condenacao IS NOT NULL AND valor_causa IS NOT NULL), 0)::numeric AS valor_total_beneficio
     FROM cond`,
    [idEmpresa]
  );
  return rows[0];
}

module.exports = { getTotais, getPorCategoria, getPorSituacao, getTopPedidos, getCondenacao };
