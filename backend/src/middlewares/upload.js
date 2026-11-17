const multer = require('multer');
const { httpError } = require('../utils/httpError');

const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// memoryStorage: o arquivo nunca é gravado em disco, só em req.file.buffer
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

// converte erros de callback do multer em erros com status HTTP adequado
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
