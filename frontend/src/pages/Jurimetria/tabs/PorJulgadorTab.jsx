import Card from '../../../components/ui/Card.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import ErrorState from '../../../components/ui/ErrorState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import JuizDashboardCard from '../../../components/jurimetria/JuizDashboardCard.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { buscarJurimetriaJuizes, buscarJurimetriaDesembargadores } from '../../../services/jurimetria.service.js';

function ListaJulgadores({ lista, chaveId, vazioTitulo, vazioDescricao }) {
  if (lista.length === 0) return <EmptyState title={vazioTitulo} description={vazioDescricao} />;
  return (
    <div className="space-y-3">
      {lista.map((julgador, i) => (
        <JuizDashboardCard key={julgador[chaveId]} juiz={julgador} defaultOpen={lista.length === 1 || i === 0} />
      ))}
    </div>
  );
}

export default function PorJulgadorTab({ filtros }) {
  const chave = JSON.stringify(filtros);
  const juizes = useApi(() => buscarJurimetriaJuizes(filtros), [chave]);
  const desembargadores = useApi(() => buscarJurimetriaDesembargadores(filtros), [chave]);

  if (juizes.loading || desembargadores.loading) return <LoadingState label="Carregando estatísticas por julgador..." />;
  if (juizes.error) return <ErrorState message={juizes.error} onRetry={juizes.reload} />;
  if (desembargadores.error) return <ErrorState message={desembargadores.error} onRetry={desembargadores.reload} />;
  if (!juizes.data || !desembargadores.data) return null;

  return (
    <div className="space-y-6">
      <Card title="Juízes (1º grau) - tendência por pedido">
        <p className="mb-4 text-sm text-slate-500">
          A chance histórica de cada resultado por pedido, calculada sobre as sentenças analisadas. Ex.: em "Danos
          morais" o juiz julgou 70% improcedente e 30% procedente. Pedidos sem resultado não entram no percentual;
          são contagens históricas, não previsões.
        </p>
        <ListaJulgadores
          lista={juizes.data}
          chaveId="id_juiz"
          vazioTitulo="Sem dados de juízes para esses filtros"
          vazioDescricao="Os dados aparecem depois que uma sentença é analisada pela IA."
        />
      </Card>

      <Card title="Desembargadores / relatores (2º grau) - tendência por pedido">
        <p className="mb-4 text-sm text-slate-500">
          A chance histórica de cada resultado por pedido nos acórdãos analisados, e em quantos casos o relator
          reformou a sentença. O histórico do juiz de 1º grau é mantido separado.
        </p>
        <ListaJulgadores
          lista={desembargadores.data}
          chaveId="id_desembargador"
          vazioTitulo="Sem dados de desembargadores para esses filtros"
          vazioDescricao="Os dados aparecem depois que um acórdão (com relator informado) é analisado pela IA."
        />
      </Card>
    </div>
  );
}
