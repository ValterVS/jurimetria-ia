const { z } = require('zod');

const parteSchema = z.object({
  nome_parte: z
    .string({ required_error: 'nome_parte é obrigatório.' })
    .trim()
    .min(1, 'nome_parte é obrigatório.')
    .max(200, 'nome_parte deve ter no máximo 200 caracteres.'),
  cpf_cnpj: z.string().trim().max(50).optional().nullable(),
  endereco: z.string().trim().max(200).optional().nullable(),
});

const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

module.exports = { parteSchema, listQuerySchema };
