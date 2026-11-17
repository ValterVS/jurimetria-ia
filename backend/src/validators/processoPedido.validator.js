const { z } = require('zod');

// 'resultado' normalmente vem da análise de IA, mas também pode ser ajustado manualmente
const resultadoEnum = z
  .enum(['procedente', 'improcedente', 'parcialmente_procedente'])
  .optional()
  .nullable();

// fundamento que diferencia pedidos de mesmo nome no processo (ex: "por rescisão")
const descricaoSchema = z
  .string()
  .trim()
  .max(300, 'descricao deve ter no máximo 300 caracteres.')
  .transform((v) => (v === '' ? null : v))
  .optional()
  .nullable();

const addSchema = z.object({
  id_pedido: z.coerce.number().int().positive({ message: 'id_pedido é obrigatório.' }),
  descricao: descricaoSchema,
  valor: z.coerce.number().nonnegative().optional().nullable(),
  resultado: resultadoEnum,
});

const updateSchema = z.object({
  descricao: descricaoSchema,
  valor: z.coerce.number().nonnegative().optional().nullable(),
  resultado: resultadoEnum,
});

module.exports = { addSchema, updateSchema };
