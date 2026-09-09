const { z } = require('zod');

// O arquivo (quando enviado) chega via multipart em req.file (multer),
// não passa por este schema. 'texto' é opcional aqui porque a regra
// "texto e/ou arquivo" é validada no DecisionAnalysisService, que é quem
// tem visibilidade dos dois juntos (req.body.texto e req.file).
const analisarSchema = z.object({
  texto: z.string().trim().min(1).optional(),
});

module.exports = { analisarSchema };
