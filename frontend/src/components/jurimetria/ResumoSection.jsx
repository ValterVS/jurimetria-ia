import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import Card from '../ui/Card.jsx';
import KpiCard from './KpiCard.jsx';
import ResultadoBarras from './ResultadoBarras.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { buscarResumoJurimetria, buscarJurimetriaPorPedido } from '../../services/jurimetria.service.js';
import { formatarPercentual } from '../../utils/formatters.js';

const CORES_PIZZA = { Procedente: '#10b981', Improcedente: '#ef4444', 'Parcialmente procedente': '#f59e0b' };

// mínimo de decisões para um pedido entrar nos rankings de chance
const AMOSTRA_RANKING = 3;
const TAMANHO_RANKING = 5;

function paraLinha(p) {
  return {
    chave: p.id,
    nome: p.nome,
    procedentes: p.procedentes,
    improcedentes: p.improcedentes,
    parciais: p.parciais,
    sem_resultado: 0,
    amostra_pequena: p.total_analisados < 5,
  };
}

// Aba "Resumo" da Jurimetria: visão geral dos resultados, já respeitando os
// filtros. (O Dashboard tem o panorama de processos e valores.)
export default function ResumoSection({ filtros }) {
  const chave = JSON.stringify(filtros);
  const resumo = useApi(() => buscarResumoJurimetria(filtros), [chave]);
  const porPedido = useApi(() => buscarJurimetriaPorPedido(filtros), [chave]);

  if (resumo.loading || porPedido.loading) return <LoadingState label="Carregando indicadores..." />;
  if (resumo.error) return <ErrorState message={resumo.error} onRetry={resumo.reload} />;
  if (porPedido.error) return <ErrorState message={porPedido.error} onRetry={porPedido.reload} />;
  const data = resumo.data;
  if (!data) return null;

  const { pedidos } = data;
  const semResultado = Math.max(0, pedidos.total_vinculados - pedidos.total_analisados);
  const fatias = [
    { nome: 'Procedente', total: pedidos.procedentes },
    { nome: 'Improcedente', total: pedidos.improcedentes },
    { nome: 'Parcialmente procedente', total: pedidos.parciais },
  ].filter((f) => f.total > 0);

  const tituloPizza = data.pedido_selecionado
    ? `Como "${data.pedido_selecionado.nome_pedido}" foi julgado`
    : 'Como os pedidos foram julgados';

  // rankings só fazem sentido quando há mais de um pedido na tela
  const candidatos = (porPedido.data || []).filter((p) => p.total_analisados >= AMOSTRA_RANKING);
  // cada pedido entra só no ranking do resultado que predomina nele (empates
  // ficam de fora), para as duas listas nunca repetirem o mesmo pedido
  const maisProcedentes = candidatos
    .filter((p) => p.percentual_procedencia > p.percentual_improcedencia)
    .sort((a, b) => b.percentual_procedencia - a.percentual_procedencia || b.total_analisados - a.total_analisados)
    .slice(0, TAMANHO_RANKING);
  const maisImprocedentes = candidatos
    .filter((p) => p.percentual_improcedencia > p.percentual_procedencia)
    .sort((a, b) => b.percentual_improcedencia - a.percentual_improcedencia || b.total_analisados - a.total_analisados)
    .slice(0, TAMANHO_RANKING);

  const reformas = data.reformas_segundo_grau;
  const percentualReformaAcordaos =
    reformas.total_acordaos > 0 ? Math.round((reformas.reformadas / reformas.total_acordaos) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pedidos julgados"
          value={pedidos.total_analisados}
          hint={`${semResultado} sem resultado · ${data.total_processos} processo(s)`}
        />
        <KpiCard
          label="Procedência"
          value={pedidos.total_analisados > 0 ? formatarPercentual(pedidos.percentual_procedencia) : '-'}
          hint={`${pedidos.procedentes} pedido(s) procedente(s)`}
        />
        <KpiCard
          label="Improcedência"
          value={pedidos.total_analisados > 0 ? formatarPercentual(pedidos.percentual_improcedencia) : '-'}
          hint={`${pedidos.improcedentes} pedido(s) improcedente(s)`}
        />
        <KpiCard
          label="Reforma em 2º grau"
          value={pedidos.percentual_reforma === null ? '-' : formatarPercentual(pedidos.percentual_reforma)}
          hint={`${pedidos.pedidos_reformados} de ${pedidos.pedidos_segundo_grau} pedido(s) julgados em 2º grau`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={tituloPizza}>
          {fatias.length === 0 ? (
            <EmptyState
              title="Sem pedidos julgados para esses filtros"
              description="Os dados aparecem depois que uma sentença ou acórdão é analisado pela IA."
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fatias}
                  dataKey="total"
                  nameKey="nome"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {fatias.map((f) => (
                    <Cell key={f.nome} fill={CORES_PIZZA[f.nome]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Reforma das sentenças em 2º grau">
          {reformas.total_acordaos === 0 ? (
            <EmptyState title="Sem acórdãos cadastrados ainda" />
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">
                <strong className="text-2xl font-semibold text-slate-900">{formatarPercentual(percentualReformaAcordaos)}</strong>{' '}
                dos acórdãos reformaram a sentença
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {[
                  [reformas.reformadas, '#f59e0b'],
                  [reformas.mantidas, '#10b981'],
                  [reformas.nao_informado, '#94a3b8'],
                ].map(([qtd, cor], i) =>
                  qtd > 0 ? <div key={i} style={{ width: `${(qtd / reformas.total_acordaos) * 100}%`, backgroundColor: cor }} /> : null
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />{reformas.reformadas} reformado(s)</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />{reformas.mantidas} mantido(s)</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />{reformas.nao_informado} não informado(s)</span>
              </div>
              <p className="text-xs text-slate-400">de {reformas.total_acordaos} acórdão(s) no total</p>
            </div>
          )}
        </Card>
      </div>

      {!filtros.id_pedido && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Pedidos com maior índice de procedência">
            {maisProcedentes.length === 0 ? (
              <EmptyState title="Dados insuficientes" description={`Precisa de pelo menos ${AMOSTRA_RANKING} decisões por pedido.`} />
            ) : (
              <ResultadoBarras linhas={maisProcedentes.map(paraLinha)} />
            )}
          </Card>
          <Card title="Pedidos com maior índice de improcedência">
            {maisImprocedentes.length === 0 ? (
              <EmptyState title="Dados insuficientes" description={`Precisa de pelo menos ${AMOSTRA_RANKING} decisões por pedido.`} />
            ) : (
              <ResultadoBarras linhas={maisImprocedentes.map(paraLinha)} />
            )}
          </Card>
        </div>
      )}

      <Card title="Evolução mensal dos resultados (por data de distribuição do processo)">
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

      <p className="text-xs text-slate-400">
        Todos os percentuais desta página são estatísticas históricas calculadas a partir dos processos já julgados -
        nunca uma previsão ou garantia de resultado futuro.
      </p>
    </div>
  );
}
