import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Header from '../../layouts/Header.jsx';
import Table from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { TextInput } from '../../components/ui/FormField.jsx';
import { SituacaoBadge } from '../../components/ui/Badge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { listarProcessos } from '../../services/processos.service.js';
import { formatarMoeda, formatarData } from '../../utils/formatters.js';

const LIMIT = 20;

export default function ProcessosListPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [offset, setOffset] = useState(0);

  const { data, loading, error, reload } = useApi(
    () => listarProcessos({ numero_processo: busca || undefined, limit: LIMIT, offset }),
    [busca, offset]
  );

  return (
    <>
      <Header
        title="Processos"
        subtitle="Gerencie os processos cadastrados"
        actions={
          <Button onClick={() => navigate('/processos/novo')}>
            <Plus className="h-4 w-4" /> Novo processo
          </Button>
        }
      />
      <div className="space-y-4 p-8">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            placeholder="Buscar por número do processo..."
            value={busca}
            onChange={(e) => {
              setOffset(0);
              setBusca(e.target.value);
            }}
            className="pl-9"
          />
        </div>

        {loading && <LoadingState label="Carregando processos..." />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="Nenhum processo encontrado"
            description="Cadastre o primeiro processo para começar."
            action={<Button onClick={() => navigate('/processos/novo')}>Novo processo</Button>}
          />
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <Table
              rowKey="id_processo"
              onRowClick={(row) => navigate(`/processos/${row.id_processo}`)}
              columns={[
                { key: 'numero_processo', header: 'Número' },
                { key: 'nome_tribunal', header: 'Tribunal' },
                { key: 'nome_comarca', header: 'Comarca' },
                { key: 'nome_vara', header: 'Vara' },
                { key: 'data_distribuicao', header: 'Distribuição', render: (r) => formatarData(r.data_distribuicao) },
                { key: 'valor_causa', header: 'Valor da causa', render: (r) => formatarMoeda(r.valor_causa) },
                { key: 'nome_situacao', header: 'Situação', render: (r) => <SituacaoBadge situacao={r.nome_situacao} /> },
              ]}
              rows={data.items}
            />
            <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </div>
    </>
  );
}
