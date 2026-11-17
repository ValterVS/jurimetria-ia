const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    pp.id_processo_pedido, pp.id_processo, pp.id_pedido, pp.descricao, pp.valor,
    pp.resultado, pp.reformado,
    pp.id_juiz, j.nome_juiz, pp.resultado_sentenca,
    pp.id_desembargador, d.nome_desembargador, pp.resultado_acordao,
    pe.nome_pedido
  FROM processo_pedidos pp
  JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
  LEFT JOIN juiz j ON j.id_juiz = pp.id_juiz
  LEFT JOIN desembargador d ON d.id_desembargador = pp.id_desembargador
`;

async function findByProcesso(idProcesso) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE pp.id_processo = $1 ORDER BY pe.nome_pedido ASC, pp.descricao ASC NULLS FIRST, pp.id_processo_pedido ASC`,
    [idProcesso]
  );
  return rows;
}

async function findOne(idProcesso, idVinculo) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE pp.id_processo = $1 AND pp.id_processo_pedido = $2`,
    [idProcesso, idVinculo]
  );
  return rows[0] || null;
}

async function create(idProcesso, { id_pedido, descricao = null, valor = null, resultado = null }) {
  const { rows } = await pool.query(
    `INSERT INTO processo_pedidos (id_processo, id_pedido, descricao, valor, resultado)
     VALUES ($1, $2, $3, $4, $5) RETURNING id_processo_pedido`,
    [idProcesso, id_pedido, descricao, valor, resultado]
  );
  return findOne(idProcesso, rows[0].id_processo_pedido);
}

// Edição manual. A descrição só muda quando é informada.
async function update(idProcesso, idVinculo, { valor = null, resultado = null, descricao }) {
  const sets = ['valor = $1', 'resultado = $2'];
  const params = [valor, resultado];
  if (descricao !== undefined) {
    params.push(descricao);
    sets.push(`descricao = $${params.length}`);
  }
  params.push(idProcesso, idVinculo);

  await pool.query(
    `UPDATE processo_pedidos SET ${sets.join(', ')}
     WHERE id_processo = $${params.length - 1} AND id_processo_pedido = $${params.length}`,
    params
  );
  return findOne(idProcesso, idVinculo);
}

// Análise de SENTENÇA (1º grau): grava o resultado da sentença e o juiz que a
// proferiu. O resultado atual só muda se ainda não houver acórdão; se já
// houver, apenas a marca de reforma é recalculada.
async function registrarSentenca(idVinculo, { valor, resultado, id_juiz, descricao, fundamentacao }) {
  await pool.query(
    `UPDATE processo_pedidos
     SET valor = COALESCE($1, valor),
         resultado_sentenca = $2::varchar,
         id_juiz = $3,
         descricao = COALESCE(descricao, $5),
         fundamentacao_sentenca = COALESCE($6, fundamentacao_sentenca),
         resultado = CASE WHEN resultado_acordao IS NULL THEN $2::varchar ELSE resultado END,
         reformado = CASE
           WHEN resultado_acordao IS NOT NULL AND $2::varchar IS NOT NULL THEN resultado_acordao <> $2::varchar
           ELSE reformado END
     WHERE id_processo_pedido = $4`,
    [valor ?? null, resultado ?? null, id_juiz ?? null, idVinculo, descricao ?? null, fundamentacao ?? null]
  );
}

// Análise de ACÓRDÃO (2º grau): grava o resultado do acórdão e o relator,
// atualiza o resultado atual (status) e sinaliza a reforma quando difere da
// sentença. Juiz e resultado da sentença nunca são alterados aqui.
async function registrarAcordao(idVinculo, { valor, resultado, id_desembargador, descricao, fundamentacao }) {
  await pool.query(
    `UPDATE processo_pedidos
     SET valor = COALESCE($1, valor),
         resultado_acordao = $2::varchar,
         id_desembargador = $3,
         descricao = COALESCE(descricao, $5),
         fundamentacao_acordao = COALESCE($6, fundamentacao_acordao),
         resultado = COALESCE($2::varchar, resultado),
         reformado = CASE
           WHEN $2::varchar IS NOT NULL AND resultado_sentenca IS NOT NULL THEN $2::varchar <> resultado_sentenca
           ELSE reformado END
     WHERE id_processo_pedido = $4`,
    [valor ?? null, resultado ?? null, id_desembargador ?? null, idVinculo, descricao ?? null, fundamentacao ?? null]
  );
}

// Marca o juiz nos pedidos que a IA não mencionou na sentença, sem mexer no
// resultado (ficam como "sem resultado" para aquele juiz).
async function definirJuizNosPedidos(idVinculos, idJuiz) {
  if (!idVinculos.length) return;
  await pool.query('UPDATE processo_pedidos SET id_juiz = $1 WHERE id_processo_pedido = ANY($2::int[])', [
    idJuiz,
    idVinculos,
  ]);
}

async function remove(idProcesso, idVinculo) {
  const { rowCount } = await pool.query(
    'DELETE FROM processo_pedidos WHERE id_processo = $1 AND id_processo_pedido = $2',
    [idProcesso, idVinculo]
  );
  return rowCount > 0;
}

module.exports = {
  findByProcesso,
  findOne,
  create,
  update,
  registrarSentenca,
  registrarAcordao,
  definirJuizNosPedidos,
  remove,
};
