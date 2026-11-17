import ResultadoBarras from './ResultadoBarras.jsx';

// Lista de barras de resultado (nomes longos quebram de linha em vez de
// sobrepor o texto). Contagens históricas, não é previsão.
export default function ResultadosBarChart({ data, limite = 10 }) {
  const linhas = [...data]
    .sort((a, b) => b.total_analisados - a.total_analisados || a.nome.localeCompare(b.nome))
    .slice(0, limite)
    .map((r) => ({
      chave: r.id,
      nome: r.nome,
      procedentes: r.procedentes,
      improcedentes: r.improcedentes,
      parciais: r.parciais,
      sem_resultado: 0,
      amostra_pequena: r.total_analisados < 5,
    }));

  return <ResultadoBarras linhas={linhas} />;
}
