// AnonymizationService: mascaramento de dados pessoais no texto de uma
// decisão ANTES de qualquer envio à Anthropic, conforme exigência de LGPD do
// projeto.
//
// IMPORTANTE - limitação honesta: isto é um mascaramento best-effort
// baseado em expressões regulares. Textos jurídicos têm formatos muito
// variados (CPF sem pontuação, RG em formatos distintos por estado,
// endereços escritos de formas diferentes etc.), então não há garantia
// absoluta de remoção de 100% dos dados pessoais, nem impossibilidade de
// falso-positivo (por exemplo, um número de processo longo pode
// eventualmente colidir com o padrão de CPF/CNPJ). Para um ambiente de
// produção real com dados sensíveis em maior escala, o recomendável seria
// evoluir para uma abordagem de NER (reconhecimento de entidades nomeadas).
//
// O que este serviço NUNCA remove, por ser necessário aos indicadores de
// jurimetria: nome de tribunal, comarca, vara, juiz, desembargador,
// ministro, órgão julgador.
const PATTERNS = {
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  telefone: /\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g,
  cep: /\b\d{5}-?\d{3}\b/g,
  rg: /\bRG\.?\s*(?:n[ºo.]?)?\s*[\d.]{5,12}-?[\dXx]?\b/gi,
  dados_bancarios: /\b(?:ag[êe]ncia|conta\s*corrente|c\/c|pix)\s*:?\s*[\w.\-]+\b/gi,
};

// Heurística separada (não é um padrão "fechado" como os acima): linhas
// que começam com logradouro comum em endereços brasileiros.
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
