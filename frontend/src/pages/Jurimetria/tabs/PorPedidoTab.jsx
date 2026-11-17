import Card from '../../../components/ui/Card.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import ErrorState from '../../../components/ui/ErrorState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import ResultadoBarras from '../../../components/jurimetria/ResultadoBarras.jsx';
import ResultadosTable from '../../../components/jurimetria/ResultadosTable.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { buscarJurimetriaPorPedido } from '../../../services/jurimetria.service.js';

function descricaoDoEscopo(filtros) {
  if (filtros.id_juiz && filtros.id_desembargador) return 'Pedidos decididos pelo juiz e pelo desembargador selecionados (resultado atual).';
  if (filtros.id_juiz) return 'Como o juiz selecionado julgou cada pedido (resultado das sentenças dele).';
  if (filtros.id_desembargador) return 'Como o desembargador selecionado julgou cada pedido (resultado dos acórdãos dele).';
  return 'Resultado atual de cada pedido em todos os processos (o acórdão prevalece sobre a sentença).';
}

export default function PorPedidoTab({ filtros }) {
  const { data, loading, error, reload } = useApi(() => buscarJurimetriaPorPedido(filtros), [JSON.stringify(filtros)]);

  if (loading) return <LoadingState label="Carregando estatísticas por pedido..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState title="Nenhum pedido com dados para esses filtros" />;

  const linhas = [...data]
    .sort((a, b) => b.total_analisados - a.total_analisados || a.nome.localeCompare(b.nome))
    .map((p) => ({
      chave: p.id,
      nome: p.nome,
      procedentes: p.procedentes,
      improcedentes: p.improcedentes,
      parciais: p.parciais,
      sem_resultado: Math.max(0, p.total_vinculados - p.total_analisados),
      amostra_pequena: p.total_analisados < 5,
    }));

  return (
    <div className="space-y-6">
      <Card title="Chance histórica por pedido">
        <p className="mb-4 text-sm text-slate-500">{descricaoDoEscopo(filtros)}</p>
        <ResultadoBarras linhas={linhas} />
      </Card>
      <Card title="Detalhamento completo">
        <ResultadosTable data={data} mostrarValorMedio />
      </Card>
    </div>
  );
}
