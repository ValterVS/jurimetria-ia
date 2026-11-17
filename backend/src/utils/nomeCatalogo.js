// Normalização de nomes dos catálogos (tribunal, comarca, vara) para evitar
// duplicatas do tipo "Lins" / "lins" / "LINS" / "líns".

const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas']);

// chave de comparação: sem acento, minúscula, espaços colapsados
function normalizarChave(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// nome de exibição: capitaliza palavras digitadas em minúsculo ("lins" ->
// "Lins"), mantém conectores em minúsculo e preserva o que já tem maiúscula
// (siglas como TRT, nomes próprios já corretos)
function formatarNome(nome) {
  const limpo = String(nome ?? '').trim().replace(/\s+/g, ' ');
  return limpo
    .split(' ')
    .map((palavra, i) => {
      if (palavra !== palavra.toLowerCase()) return palavra;
      if (i > 0 && CONECTORES.has(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

module.exports = { normalizarChave, formatarNome };
