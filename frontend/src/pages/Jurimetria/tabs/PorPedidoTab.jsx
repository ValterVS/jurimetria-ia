import Card from '../../../components/ui/Card.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import ErrorState from '../../../components/ui/ErrorState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import ResultadosBarChart from '../../../components/jurimetria/ResultadosBarChart.jsx';
import ResultadosTable from '../../../components/jurimetria/ResultadosTable.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { buscarJurimetriaPorPedido } from '../../../services/jurimetria.service.js';

export default function PorPedidoTab({ filtros }) {
  const { data, loading, error, reload } = useApi(() => buscarJurimetriaPorPedido(filtros), [JSON.stringify(filtros)]);

  if (loading) return <LoadingState label="Carregando estatísticas por pedido..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState title="Nenhum pedido com dados para esses filtros" />;

  return (
    <div className="space-y-6">
      <Card title="Resultados por pedido (top 10 por volume julgado)">
        <ResultadosBarChart data={data} />
      </Card>
      <Card title="Detalhamento completo">
        <ResultadosTable data={data} mostrarValorMedio />
      </Card>
    </div>
  );
}
