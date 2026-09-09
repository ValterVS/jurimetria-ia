const multer = require('multer');
const { httpError } = require('../utils/httpError');

const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// memoryStorage: o arquivo nunca é gravado em disco. Fica só em
// req.file.buffer (RAM) durante a requisição e é descartado ao final -
// necessário porque o filesystem do Render/Vercel é efêmero (seção 24.15
// do escopo do projeto) e porque não queremos reter documentos jurídicos
// originais além do estritamente necessário para extrair o texto.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(httpError(400, 'Tipo de arquivo não suportado. Envie PDF, TXT ou DOCX.'));
      return;
    }
    cb(null, true);
  },
});

const uploadDecisionFile = upload.single('arquivo');

// multer reporta erros via callback (err) em vez de lançar exceção
// síncrona; este wrapper garante que esses erros cheguem ao
// errorHandler central com status HTTP adequado (400/413), em vez de
// virarem um 500 genérico ou ficarem sem tratamento.
function handleUpload(req, res, next) {
  uploadDecisionFile(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(httpError(413, 'Arquivo muito grande. O limite é 10MB.'));
      return;
    }
    next(err.status ? err : httpError(400, err.message));
  });
}

module.exports = { handleUpload, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
