const { z } = require('zod');
const { dateString } = require('./common');

// id_processo vem sempre da URL (/api/processos/:id/acordaos), não do corpo.
const acordaoSchema = z.object({
  id_relator: z.coerce.number().int().positive().optional().nullable(),
  id_desembargador1: z.coerce.number().int().positive().optional().nullable(),
  id_desembargador2: z.coerce.number().int().positive().optional().nullable(),
  data_acordao: dateString.optional().nullable(),
  id_tipo_acordao: z.coerce.number().int().positive().optional().nullable(),
  reforma_sentenca: z.boolean().optional().nullable(),
  id_tribunal: z.coerce.number().int().positive().optional().nullable(),
});

module.exports = { acordaoSchema };
