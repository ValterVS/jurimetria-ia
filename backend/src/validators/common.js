const { z } = require('zod');

// Datas trafegam como string 'AAAA-MM-DD' (não como objeto Date) para
// evitar qualquer conversão de fuso horário ao gravar em colunas DATE do
// Postgres.
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato AAAA-MM-DD.');

module.exports = { dateString };
