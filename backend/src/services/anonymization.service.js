// Mascaramento de dados pessoais no texto da decisão antes do envio à
// Anthropic (LGPD). Best-effort via regex, não NER; nunca remove nomes de
// tribunal/comarca/vara/julgador, necessários à jurimetria.
const PATTERNS = {
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  telefone: /\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g,
  cep: /\b\d{5}-?\d{3}\b/g,
  rg: /\bRG\.?\s*(?:n[ºo.]?)?\s*[\d.]{5,12}-?[\dXx]?\b/gi,
  dados_bancarios: /\b(?:ag[êe]ncia|conta\s*corrente|c\/c|pix)\s*:?\s*[\w.\-]+\b/gi,
};

// heurística de endereço: início com logradouro comum
const ENDERECO_PATTERN = /\b(?:Rua|Av\.|Avenida|Rodovia|Alameda|Travessa|Praça)\b[^\n,;]{3,80}/gi;

function anonymize(textoOriginal) {
  if (!textoOriginal) {
    return { textoAnonimizado: textoOriginal, ocorrencias: {} };
  }

  let texto = textoOriginal;
  const ocorrencias = {};

  for (const [chave, regex] of Object.entries(PATTERNS)) {
    const matches = texto.match(regex);
    ocorrencias[chave] = matches ? matches.length : 0;
    texto = texto.replace(regex, `[${chave.toUpperCase()}_REMOVIDO]`);
  }

  const enderecoMatches = texto.match(ENDERECO_PATTERN);
  ocorrencias.endereco = enderecoMatches ? enderecoMatches.length : 0;
  texto = texto.replace(ENDERECO_PATTERN, '[ENDERECO_REMOVIDO]');

  return { textoAnonimizado: texto, ocorrencias };
}

module.exports = { anonymize };
