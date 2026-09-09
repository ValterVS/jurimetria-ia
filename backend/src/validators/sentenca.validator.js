const { z } = require('zod');
const { dateString } = require('./common');

// id_processo nunca vem do corpo da requisição: sempre é extraído da URL
// (/api/processos/:id/sentencas), então não faz parte deste schema.
const sentencaSchema = z.object({
  id_juiz: z.coerce.number().int().positive({ message: 'id_juiz é obrigatório.' }),
  data_sentenca: dateString.optional().nullable(),
  id_tipo_sentenca: z.coerce.number().int().positive({ message: 'id_tipo_sentenca é obrigatório.' }),
  id_tribunal: z.coerce.number().int().positive().optional().nullable(),
  id_comarca: z.coerce.number().int().positive().optional().nullable(),
  id_vara: z.coerce.number().int().positive().optional().nullable(),
});

module.exports = { sentencaSchema };
