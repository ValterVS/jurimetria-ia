const { z } = require('zod');
const { dateString } = require('./common');

const processoSchema = z.object({
  numero_processo: z
    .string({ required_error: 'numero_processo é obrigatório.' })
    .trim()
    .min(1, 'numero_processo é obrigatório.')
    .max(48, 'numero_processo deve ter no máximo 48 caracteres.'),
  categoria: z.string().trim().max(25).optional().nullable(),
  id_tribunal: z.coerce.number().int().positive({ message: 'id_tribunal é obrigatório.' }),
  id_comarca: z.coerce.number().int().positive({ message: 'id_comarca é obrigatório.' }),
  id_vara: z.coerce.number().int().positive({ message: 'id_vara é obrigatório.' }),
  data_distribuicao: dateString,
  valor_causa: z.coerce.number().nonnegative().optional().nullable(),
  id_situacao: z.coerce.number().int().positive({ message: 'id_situacao é obrigatório.' }),
  id_juiz: z.coerce.number().int().positive().optional().nullable(),
  id_desembargador: z.coerce.number().int().positive().optional().nullable(),
  id_ministro: z.coerce.number().int().positive().optional().nullable(),
});

const listQuerySchema = z.object({
  id_tribunal: z.coerce.number().int().positive().optional(),
  id_comarca: z.coerce.number().int().positive().optional(),
  id_vara: z.coerce.number().int().positive().optional(),
  id_juiz: z.coerce.number().int().positive().optional(),
  id_desembargador: z.coerce.number().int().positive().optional(),
  id_situacao: z.coerce.number().int().positive().optional(),
  numero_processo: z.string().trim().min(1).optional(),
  data_inicio: dateString.optional(),
  data_fim: dateString.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

module.exports = { processoSchema, listQuerySchema };
