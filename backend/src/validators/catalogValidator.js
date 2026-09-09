const { z } = require('zod');

// Fábrica de schema Zod para o corpo de create/update dos catálogos simples.
function createCatalogSchema({ nameColumn, maxLength, parentColumn = null, parentRequired = false }) {
  const shape = {
    [nameColumn]: z
      .string({ required_error: `${nameColumn} é obrigatório.` })
      .trim()
      .min(1, `${nameColumn} é obrigatório.`)
      .max(maxLength, `${nameColumn} deve ter no máximo ${maxLength} caracteres.`),
  };

  if (parentColumn) {
    const idSchema = z.coerce.number().int().positive();
    shape[parentColumn] = parentRequired ? idSchema : idSchema.optional().nullable();
  }

  return z.object(shape);
}

module.exports = { createCatalogSchema };
