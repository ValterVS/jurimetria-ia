const { z } = require('zod');

// arquivo (quando enviado) chega via multer em req.file, fora deste schema
const analisarSchema = z.object({
  texto: z.string().trim().min(1).optional(),
});

module.exports = { analisarSchema };
