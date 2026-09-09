const { z } = require('zod');
const { dateString } = require('./common');

// Filtros combináveis, usados por todos os endpoints de /api/jurimetria
// (seção 11 do escopo: "permitir filtros combinados").
const jurimetriaFiltersSchema = z.object({
  id_tribunal: z.coerce.number().int().positive().optional(),
  id_comarca: z.coerce.number().int().positive().optional(),
  id_vara: z.coerce.number().int().positive().optional(),
  id_juiz: z.coerce.number().int().positive().optional(),
  id_desembargador: z.coerce.number().int().positive().optional(),
  id_situacao: z.coerce.number().int().positive().optional(),
  id_pedido: z.coerce.number().int().positive().optional(),
  data_inicio: dateString.optional(),
  data_fim: dateString.optional(),
});

module.exports = { jurimetriaFiltersSchema };
