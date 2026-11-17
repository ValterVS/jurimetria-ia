const { z } = require('zod');
const { dateString } = require('./common');

// filtros combináveis, usados por todos os endpoints de /api/jurimetria
const filtrosBase = z.object({
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

// selects do front enviam '' quando voltam para "(todos)": isso significa
// "sem filtro", não um id inválido
const jurimetriaFiltersSchema = z.preprocess(
  (valor) =>
    valor && typeof valor === 'object'
      ? Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== ''))
      : valor,
  filtrosBase
);

module.exports = { jurimetriaFiltersSchema };
