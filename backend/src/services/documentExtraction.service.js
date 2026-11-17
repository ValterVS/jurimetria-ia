const { httpError } = require('../utils/httpError');

// lazy require: só carrega a lib quando o tipo de arquivo é realmente usado
async function extractFromPdf(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDocx(buffer) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// file: objeto do multer (memoryStorage) - { buffer, mimetype, originalname, size }
async function extractText(file) {
  let texto;

  switch (file.mimetype) {
    case 'text/plain':
      texto = file.buffer.toString('utf-8');
      break;
    case 'application/pdf':
      texto = await extractFromPdf(file.buffer);
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      texto = await extractFromDocx(file.buffer);
      break;
    default:
      throw httpError(400, 'Tipo de arquivo não suportado. Envie PDF, TXT ou DOCX.');
  }

  if (!texto || !texto.trim()) {
    // caso comum: PDF escaneado (imagem) sem camada de texto - sem OCR neste MVP
    throw httpError(
      422,
      'Não foi possível extrair texto deste arquivo. Se for um PDF escaneado (imagem), ele precisa de OCR, que não é suportado nesta versão - envie o texto diretamente.'
    );
  }

  return texto;
}

module.exports = { extractText };
