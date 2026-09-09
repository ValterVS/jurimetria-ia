const { httpError } = require('../utils/httpError');

// Carregamento tardio (lazy require) das libs de parsing: assim o custo
// de inicialização delas só é pago quando um arquivo daquele tipo é
// realmente enviado.
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
    // Cobre principalmente o caso de PDF escaneado (imagem) sem camada de
    // texto - OCR não é requisito deste MVP (seção 10 do escopo).
    throw httpError(
      422,
      'Não foi possível extrair texto deste arquivo. Se for um PDF escaneado (imagem), ele precisa de OCR, que não é suportado nesta versão - envie o texto diretamente.'
    );
  }

  return texto;
}

module.exports = { extractText };
