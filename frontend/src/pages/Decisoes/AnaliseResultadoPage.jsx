import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Header from '../../layouts/Header.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { StatusAnaliseBadge, ResultadoBadge } from '../../components/ui/Badge.jsx';
import { useAnalisePolling } from '../../hooks/useAnalisePolling.js';
import { buscarAnalise } from '../../services/analises.service.js';
import { formatarDataHora } from '../../utils/formatters.js';

const STATUS_EM_ANDAMENTO = ['Pendente', 'Em Análise'];

export default function AnaliseResultadoPage() {
  const { id } = useParams();
  const { analise, erro } = useAnalisePolling(id, buscarAnalise);

  if (erro) return <ErrorState message={erro} />;
  if (!analise) return <LoadingState label="Carregando análise..." />;

  const emAndamento = STATUS_EM_ANDAMENTO.includes(analise.status);
  const insights = analise.insights_json;

  return (
    <>
      <Header
        title="Análise da decisão"
        subtitle={`Análise #${analise.id_analise}`}
        actions={<StatusAnaliseBadge status={analise.status} />}
      />
      <div className="max-w-4xl space-y-6 p-8">
        {emAndamento && (
          <Card>
            <LoadingState label={`Analisando decisão... (status: ${analise.status})`} />
            <p className="text-center text-xs text-slate-400">Esta página atualiza automaticamente.</p>
          </Card>
        )}

        {analise.status === 'Erro' && (
          <Card title="Falha na análise">
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Não foi possível concluir a análise.</p>
                {analise.erro_log && <p className="mt-1 text-red-700">{analise.erro_log}</p>}
              </div>
            </div>
          </Card>
        )}

        {analise.status === 'Concluída' && insights && (
          <>
            {insights.necessita_revisao_humana && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Esta análise foi marcada como necessitando revisão humana.
              </div>
            )}

            <Card title="Resumo">
              <p className="text-sm text-slate-700">{insights.resumo}</p>
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500">
                <span>
                  Tipo: <strong className="text-slate-700">{insights.tipo_documento}</strong>
                </span>
                <span>
                  Resultado geral:{' '}
                  <ResultadoBadge resultado={insights.resultado_geral === 'nao_identificado' ? null : insights.resultado_geral} />
                </span>
                <span>
                  Julgador: <strong className="text-slate-700">{insights.julgador?.nome || 'Não identificado'}</strong>
                </span>
              </div>
            </Card>

            <Card title="Pedidos analisados">
              {insights.pedidos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum pedido identificado no texto.</p>
              ) : (
                <div className="space-y-4">
                  {insights.pedidos.map((pedido, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{pedido.nome}</p>
                        <ResultadoBadge resultado={pedido.resultado === 'nao_identificado' ? null : pedido.resultado} />
                      </div>
                      {pedido.fundamentacao_resumida && (
                        <p className="mt-2 text-sm text-slate-600">{pedido.fundamentacao_resumida}</p>
                      )}
                      {pedido.trecho_relevante && (
                        <blockquote className="mt-2 border-l-2 border-slate-200 pl-3 text-xs italic text-slate-500">
                          "{pedido.trecho_relevante}"
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card title="Pontos favoráveis">
                {insights.pontos_favoraveis.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum ponto identificado.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {insights.pontos_favoraveis.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Pontos desfavoráveis">
                {insights.pontos_desfavoraveis.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum ponto identificado.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {insights.pontos_desfavoraveis.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card title="Metadados do processamento">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Modelo</dt>
                  <dd className="text-slate-700">{analise.plataforma_utilizada || '-'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Tokens (entrada)</dt>
                  <dd className="text-slate-700">{analise.input_tokens ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Tokens (saída)</dt>
                  <dd className="text-slate-700">{analise.output_tokens ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Processado em</dt>
                  <dd className="text-slate-700">{formatarDataHora(analise.data_processamento)}</dd>
                </div>
              </dl>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
