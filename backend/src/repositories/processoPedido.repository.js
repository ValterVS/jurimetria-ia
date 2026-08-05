const pool = require('../config/db');

const SELECT_BASE = `
  SELECT
    pp.id_processo, pp.id_pedido, pp.valor, pp.resultado,
    pe.nome_pedido
  FROM processo_pedidos pp
  JOIN pedidos pe ON pe.id_pedido = pp.id_pedido
`;

async function findByProcesso(idProcesso) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE pp.id_processo = $1 ORDER BY pe.nome_pedido ASC`, [
    idProcesso,
  ]);
  return rows;
}

async function findOne(idProcesso, idPedido) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE pp.id_processo = $1 AND pp.id_pedido = $2`, [
    idProcesso,
    idPedido,
  ]);
  return rows[0] || null;
}

async function create(idProcesso, { id_pedido, valor = null, resultado = null }) {
  await pool.query(
    'INSERT INTO processo_pedidos (id_processo, id_pedido, valor, resultado) VALUES ($1, $2, $3, $4)',
    [idProcesso, id_pedido, valor, resultado]
  );
  return findOne(idProcesso, id_pedido);
}

async function update(idProcesso, idPedido, { valor = null, resultado = null }) {
  await pool.query(
    'UPDATE processo_pedidos SET valor = $1, resultado = $2 WHERE id_processo = $3 AND id_pedido = $4',
    [valor, resultado, idProcesso, idPedido]
  );
  return findOne(idProcesso, idPedido);
}

async function remove(idProcesso, idPedido) {
  const { rowCount } = await pool.query(
    'DELETE FROM processo_pedidos WHERE id_processo = $1 AND id_pedido = $2',
    [idProcesso, idPedido]
  );
  return rowCount > 0;
}

module.exports = { findByProcesso, findOne, create, update, remove };
