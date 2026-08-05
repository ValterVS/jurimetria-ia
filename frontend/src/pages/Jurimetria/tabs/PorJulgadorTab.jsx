import Card from '../../../components/ui/Card.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import ErrorState from '../../../components/ui/ErrorState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import ResultadosBarChart from '../../../components/jurimetria/ResultadosBarChart.jsx';
import ResultadosTable from '../../../components/jurimetria/ResultadosTable.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { buscarJurimetriaPorJulgador } from '../../../services/jurimetria.service.js';

export default function PorJulgadorTab({ filtros }) {
  const { data, loading, error, reload } = useApi(() => buscarJurimetriaPorJulgador(filtros), [JSON.stringify(filtros)]);

  if (loading) return <LoadingState label="Carregando estatísticas por julgador..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card title="Por juiz">
        {data.por_juiz.length === 0 ? (
          <EmptyState title="Sem dados de juízes para esses filtros" />
        ) : (
          <>
            <ResultadosBarChart data={data.por_juiz} />
            <div className="mt-4">
              <ResultadosTable data={data.por_juiz} />
            </div>
          </>
        )}
      </Card>
      <Card title="Por desembargador">
        {data.por_desembargador.length === 0 ? (
          <EmptyState title="Sem dados de desembargadores para esses filtros" />
        ) : (
          <>
            <ResultadosBarChart data={data.por_desembargador} />
            <div className="mt-4">
              <ResultadosTable data={data.por_desembargador} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
