// Utilitário de teste: substitui, no cache de módulos do Node (CommonJS),
// o conteúdo de um módulo por um objeto fake ANTES que outro módulo o
// exija - permitindo testar orquestradores (ex: decisionAnalysisService)
// sem tocar banco de dados real nem a API da Anthropic de verdade.
//
// `resolvedPath` deve ser um caminho absoluto (normalmente obtido via
// `require.resolve(path.resolve(__dirname, '...'))` no arquivo de teste).
//
// Uso típico:
//   const restore = mockModule(repoPath, { findById: async () => fakeRow });
//   delete require.cache[require.resolve(pathDoServicoQueDependeDele)];
//   const servico = require(pathDoServicoQueDependeDele); // agora usa o fake
//   ... asserts ...
//   restore();
function mockModule(resolvedPath, fakeExports) {
  const original = require.cache[resolvedPath];
  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports: fakeExports,
  };
  return function restore() {
    if (original) {
      require.cache[resolvedPath] = original;
    } else {
      delete require.cache[resolvedPath];
    }
  };
}

// Remove um módulo (e, opcionalmente, seus dependentes diretos passados em
// `alsoClear`) do cache, forçando reavaliação do require na próxima
// chamada - necessário para que um módulo já carregado "veja" os mocks
// registrados depois dele.
function clearCache(...resolvedPaths) {
  for (const p of resolvedPaths) {
    delete require.cache[p];
  }
}

module.exports = { mockModule, clearCache };
