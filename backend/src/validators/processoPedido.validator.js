const { z } = require('zod');

// 'resultado' normalmente é preenchido pela análise de IA (Fase 7), mas o
// MVP permite definição/ajuste manual também.
const resultadoEnum = z
  .enum(['procedente', 'improcedente', 'parcialmente_procedente'])
  .optional()
  .nullable();

const addSchema = z.object({
  id_pedido: z.coerce.number().int().positive({ message: 'id_pedido é obrigatório.' }),
  valor: z.coerce.number().nonnegative().optional().nullable(),
  resultado: resultadoEnum,
});

const updateSchema = z.object({
  valor: z.coerce.number().nonnegative().optional().nullable(),
  resultado: resultadoEnum,
});

module.exports = { addSchema, updateSchema };
