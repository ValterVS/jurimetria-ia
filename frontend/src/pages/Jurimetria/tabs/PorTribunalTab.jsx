import Card from '../../../components/ui/Card.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import ErrorState from '../../../components/ui/ErrorState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import ResultadosBarChart from '../../../components/jurimetria/ResultadosBarChart.jsx';
import ResultadosTable from '../../../components/jurimetria/ResultadosTable.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { buscarJurimetriaPorTribunal } from '../../../services/jurimetria.service.js';

const SECOES = [
  { key: 'por_tribunal', titulo: 'Por tribunal' },
  { key: 'por_comarca', titulo: 'Por comarca' },
  { key: 'por_vara', titulo: 'Por vara' },
];

export default function PorTribunalTab({ filtros }) {
  const { data, loading, error, reload } = useApi(() => buscarJurimetriaPorTribunal(filtros), [JSON.stringify(filtros)]);

  if (loading) return <LoadingState label="Carregando estatísticas por tribunal..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {SECOES.map((secao) => (
        <Card key={secao.key} title={secao.titulo}>
          {data[secao.key].length === 0 ? (
            <EmptyState title={`Sem dados para esses filtros`} />
          ) : (
            <>
              <ResultadosBarChart data={data[secao.key]} />
              <div className="mt-4">
                <ResultadosTable data={data[secao.key]} />
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
