import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Gavel } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { StatusAnaliseBadge } from '../../../components/ui/Badge.jsx';
import { useApi } from '../../../hooks/useApi.js';
import {
  listarSentencasDoProcesso,
  listarAcordaosDoProcesso,
  listarPedidosDoProcesso,
} from '../../../services/processos.service.js';
import { formatarData } from '../../../utils/formatters.js';

export default function DecisoesTab({ idProcesso }) {
  const navigate = useNavigate();
  const { data: sentencas, loading: carregandoSentencas } = useApi(() => listarSentencasDoProcesso(idProcesso), [idProcesso]);
  const { data: acordaos, loading: carregandoAcordaos } = useApi(() => listarAcordaosDoProcesso(idProcesso), [idProcesso]);
  const { data: pedidos, loading: carregandoPedidos } = useApi(() => listarPedidosDoProcesso(idProcesso), [idProcesso]);

  // a análise grava o resultado nos pedidos, então eles vêm antes da decisão
  const semPedidos = !carregandoPedidos && (pedidos || []).length === 0;

  return (
    <div className="space-y-6">
      {semPedidos && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Vincule os pedidos do processo na aba <strong>Pedidos</strong> antes de registrar uma sentença ou um
          acórdão. O resultado de cada pedido e o juiz que decidiu são preenchidos pela análise de IA.
        </div>
      )}
      <Card
        title="Sentenças"
        actions={
          <Button
            variant="secondary"
            disabled={carregandoPedidos || semPedidos}
            onClick={() => navigate(`/processos/${idProcesso}/sentencas/nova`)}
          >
            <Plus className="h-4 w-4" /> Adicionar sentença
          </Button>
        }
      >
        {carregandoSentencas ? (
          <LoadingState label="Carregando sentenças..." />
        ) : sentencas.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma sentença cadastrada" />
        ) : (
          <Table
            rowKey="id_sentenca"
            onRowClick={(r) => r.id_analise && navigate(`/analises/${r.id_analise}`)}
            columns={[
              { key: 'data_sentenca', header: 'Data', render: (r) => formatarData(r.data_sentenca) },
              { key: 'nome_juiz', header: 'Juiz', render: (r) => r.nome_juiz || '-' },
              { key: 'nome_tipo_sentenca', header: 'Tipo', render: (r) => r.nome_tipo_sentenca || '-' },
              {
                key: 'status_analise',
                header: 'Análise de IA',
                render: (r) =>
                  r.status_analise ? (
                    <StatusAnaliseBadge status={r.status_analise} />
                  ) : (
                    <span className="text-slate-400">Não enviada</span>
                  ),
              },
            ]}
            rows={sentencas}
          />
        )}
      </Card>

      <Card
        title="Acórdãos"
        actions={
          <Button
            variant="secondary"
            disabled={carregandoPedidos || semPedidos}
            onClick={() => navigate(`/processos/${idProcesso}/acordaos/novo`)}
          >
            <Plus className="h-4 w-4" /> Adicionar acórdão
          </Button>
        }
      >
        {carregandoAcordaos ? (
          <LoadingState label="Carregando acórdãos..." />
        ) : acordaos.length === 0 ? (
          <EmptyState icon={Gavel} title="Nenhum acórdão cadastrado" />
        ) : (
          <Table
            rowKey="id_acordao"
            onRowClick={(r) => r.id_analise && navigate(`/analises/${r.id_analise}`)}
            columns={[
              { key: 'data_acordao', header: 'Data', render: (r) => formatarData(r.data_acordao) },
              { key: 'nome_relator', header: 'Relator', render: (r) => r.nome_relator || '-' },
              { key: 'nome_tipo_acordao', header: 'Tipo', render: (r) => r.nome_tipo_acordao || '-' },
              {
                key: 'reforma_sentenca',
                header: 'Reformou?',
                render: (r) => (r.reforma_sentenca === null ? '-' : r.reforma_sentenca ? 'Sim' : 'Não'),
              },
              {
                key: 'status_analise',
                header: 'Análise de IA',
                render: (r) =>
                  r.status_analise ? (
                    <StatusAnaliseBadge status={r.status_analise} />
                  ) : (
                    <span className="text-slate-400">Não enviada</span>
                  ),
              },
            ]}
            rows={acordaos}
          />
        )}
      </Card>
    </div>
  );
}
