import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Card from '../ui/Card.jsx';
import KpiCard from './KpiCard.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { buscarResumoJurimetria } from '../../services/jurimetria.service.js';
import { formatarMoeda, formatarPercentual } from '../../utils/formatters.js';

const CORES_SITUACAO = { 'Em andamento': '#3b82f6', Suspenso: '#f59e0b', Arquivado: '#94a3b8', Encerrado: '#10b981' };
const CORES_STATUS_ANALISE = { Pendente: '#f59e0b', 'Em Análise': '#3b82f6', Concluída: '#10b981', Erro: '#ef4444' };

// Seção reutilizada tanto pelo Dashboard (sem filtros) quanto pela aba
// "Resumo" da página de Jurimetria (com os filtros combinados ativos) -
// ambos consomem o mesmo GET /api/jurimetria/resumo, só variando `filtros`.
export default function ResumoSection({ filtros }) {
  const { data, loading, error, reload } = useApi(() => buscarResumoJurimetria(filtros), [JSON.stringify(filtros)]);

  if (loading) return <LoadingState label="Carregando indicadores..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusAnaliseData = [
    { nome: 'Pendente', total: data.analises.pendente },
    { nome: 'Em Análise', total: data.analises.em_analise },
    { nome: 'Concluída', total: data.analises.concluida },
    { nome: 'Erro', total: data.analises.erro },
  ];

  const percentualReforma =
    data.reformas_segundo_grau.total_acordaos > 0
      ? Math.round((data.reformas_segundo_grau.reformadas / data.reformas_segundo_grau.total_acordaos) * 1000) / 10
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Processos" value={data.total_processos} />
        <KpiCard label="Valor total das causas" value={formatarMoeda(data.valor_total_causas)} />
        <KpiCard
          label="Análises concluídas"
          value={data.analises.concluida}
          hint={`${data.analises.total} análise(s) no total`}
        />
        <KpiCard
          label="Procedência histórica"
          value={data.pedidos.total_analisados > 0 ? formatarPercentual(data.pedidos.percentual_procedencia) : '-'}
          hint={`${data.pedidos.total_analisados} pedido(s) julgado(s)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Processos por situação">
          {data.processos_por_situacao.every((s) => s.total === 0) ? (
            <EmptyState title="Sem processos cadastrados ainda" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.processos_por_situacao}
                  dataKey="total"
                  nameKey="nome_situacao"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.processos_por_situacao.map((s) => (
                    <Cell key={s.id_situacao} fill={CORES_SITUACAO[s.nome_situacao] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Análises por status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusAnaliseData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {statusAnaliseData.map((s) => (
                  <Cell key={s.nome} fill={CORES_STATUS_ANALISE[s.nome]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Evolução mensal de procedência (por data de distribuição do processo)">
        {data.por_periodo.length === 0 ? (
          <EmptyState title="Sem dados suficientes para o período" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.por_periodo}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="percentual_procedencia" name="Procedência" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="percentual_improcedencia" name="Improcedência" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="percentual_parcial" name="Parcial" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Reforma em 2º grau">
        {data.reformas_segundo_grau.total_acordaos === 0 ? (
          <EmptyState title="Sem acórdãos cadastrados ainda" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-600">
            <span>
              <strong className="text-slate-900">{formatarPercentual(percentualReforma)}</strong> dos acórdãos
              reformaram a sentença
            </span>
            <span>{data.reformas_segundo_grau.reformadas} reformado(s)</span>
            <span>{data.reformas_segundo_grau.mantidas} mantido(s)</span>
            <span>{data.reformas_segundo_grau.nao_informado} não informado(s)</span>
            <span className="text-slate-400">de {data.reformas_segundo_grau.total_acordaos} acórdão(s) no total</span>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-400">
        Todos os percentuais desta página são estatísticas históricas calculadas a partir dos processos já julgados -
        nunca uma previsão ou garantia de resultado futuro.
      </p>
    </div>
  );
}
