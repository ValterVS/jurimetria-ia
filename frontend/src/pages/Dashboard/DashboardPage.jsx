import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from '../../layouts/Header.jsx';
import Card from '../../components/ui/Card.jsx';
import KpiCard from '../../components/jurimetria/KpiCard.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { buscarDashboard } from '../../services/dashboard.service.js';
import { formatarMoeda } from '../../utils/formatters.js';

const CORES_SITUACAO = { 'Em andamento': '#3b82f6', Suspenso: '#f59e0b', Arquivado: '#94a3b8', Encerrado: '#10b981' };

// Ranking compacto: posição, nome (quebra de linha, sem cortar), barra curta e
// quantidade. A barra tem largura fixa para não virar uma linha gigante.
function RankingLista({ itens, mostrarPosicao = false, cor = 'bg-brand-500' }) {
  const maior = Math.max(...itens.map((i) => i.total), 1);
  return (
    <ul className="divide-y divide-slate-100">
      {itens.map((item, i) => (
        <li key={item.chave} className="flex items-center gap-3 py-2.5 text-sm">
          {mostrarPosicao && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {i + 1}
            </span>
          )}
          <span className="min-w-0 flex-1 break-words text-slate-700">{item.nome}</span>
          <span className="hidden h-2 w-28 shrink-0 rounded-full bg-slate-100 sm:block">
            <span className={`block h-2 rounded-full ${cor}`} style={{ width: `${(item.total / maior) * 100}%` }} />
          </span>
          <span className="w-8 shrink-0 text-right font-semibold text-slate-900">{item.total}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi(() => buscarDashboard(), []);

  return (
    <>
      <Header title="Dashboard" subtitle="Panorama geral dos processos cadastrados" />
      <div className="space-y-6 p-8">
        {loading && <LoadingState label="Carregando indicadores..." />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Processos cadastrados" value={data.total_processos} />
              <KpiCard label="Valor total das causas" value={formatarMoeda(data.valor_total_causas)} />
              <KpiCard
                label="Valor total de condenação"
                value={formatarMoeda(data.valor_total_condenacao)}
                hint={`${data.processos_no_calculo} de ${data.total_processos} processo(s) com decisão analisada`}
              />
              <KpiCard
                label="Total de benefícios"
                value={formatarMoeda(data.valor_total_beneficio)}
                hint="Valor da causa menos a condenação"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <Card title="10 pedidos mais frequentes" className="lg:col-span-3">
                {data.top_pedidos.length === 0 ? (
                  <EmptyState
                    title="Nenhum pedido vinculado ainda"
                    description="Os pedidos aparecem aqui conforme são vinculados aos processos."
                  />
                ) : (
                  <>
                    <RankingLista
                      mostrarPosicao
                      itens={data.top_pedidos.map((p) => ({ chave: p.id_pedido, nome: p.nome_pedido, total: p.total_processos }))}
                    />
                    <p className="mt-4 text-xs text-slate-400">
                      Quantidade de processos em que cada pedido aparece. Os resultados (procedente/improcedente) ficam
                      na página de Jurimetria.
                    </p>
                  </>
                )}
              </Card>

              <div className="space-y-6 lg:col-span-2">
                <Card title="Processos por andamento">
                  {data.processos_por_situacao.every((s) => s.total === 0) ? (
                    <EmptyState title="Sem processos cadastrados ainda" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={data.processos_por_situacao}
                          dataKey="total"
                          nameKey="nome_situacao"
                          innerRadius={50}
                          outerRadius={80}
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

                <Card title="Processos por tipo">
                  {data.processos_por_categoria.length === 0 ? (
                    <EmptyState title="Sem processos cadastrados ainda" />
                  ) : (
                    <RankingLista
                      itens={data.processos_por_categoria.map((c) => ({ chave: c.categoria, nome: c.categoria, total: c.total }))}
                    />
                  )}
                  <p className="mt-4 text-xs text-slate-400">
                    Hoje o sistema cobre processos trabalhistas. Novas categorias (cível, previdenciário, etc.) serão
                    adicionadas e aparecerão aqui automaticamente.
                  </p>
                </Card>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Condenação e benefício consideram só os processos com decisão analisada (o acórdão, quando houver; senão a
              sentença). Processo julgado improcedente conta com condenação zero, ou seja, o valor da causa inteiro é benefício.
            </p>
          </>
        )}
      </div>
    </>
  );
}
