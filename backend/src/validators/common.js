const { z } = require('zod');

// datas trafegam como string 'AAAA-MM-DD', não como objeto Date
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato AAAA-MM-DD.');

module.exports = { dateString };
