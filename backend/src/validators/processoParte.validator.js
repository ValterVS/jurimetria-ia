const { z } = require('zod');

const poloEnum = z.enum(['ativo', 'passivo', 'terceiro'], {
  required_error: 'polo é obrigatório.',
  invalid_type_error: "polo deve ser 'ativo', 'passivo' ou 'terceiro'.",
});

const addSchema = z.object({
  id_parte: z.coerce.number().int().positive({ message: 'id_parte é obrigatório.' }),
  id_tipo_parte: z.coerce.number().int().positive().optional().nullable(),
  polo: poloEnum,
});

const updateSchema = z.object({
  id_tipo_parte: z.coerce.number().int().positive().optional().nullable(),
  polo: poloEnum,
});

module.exports = { addSchema, updateSchema };
