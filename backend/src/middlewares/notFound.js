function notFound(req, res) {
  res.status(404).json({ error: 'Recurso não encontrado.' });
}

module.exports = notFound;
