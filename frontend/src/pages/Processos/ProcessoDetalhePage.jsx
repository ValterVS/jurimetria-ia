import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import Header from '../../layouts/Header.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { buscarProcesso, removerProcesso } from '../../services/processos.service.js';
import VisaoGeralTab from './tabs/VisaoGeralTab.jsx';
import PartesTab from './tabs/PartesTab.jsx';
import PedidosTab from './tabs/PedidosTab.jsx';
import DecisoesTab from './tabs/DecisoesTab.jsx';

const TABS = [
  { key: 'geral', label: 'Visão Geral' },
  { key: 'partes', label: 'Partes' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'decisoes', label: 'Decisões e Análises de IA' },
];

export default function ProcessoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [aba, setAba] = useState('geral');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const { data: processo, loading, error, reload } = useApi(() => buscarProcesso(id), [id]);

  async function handleExcluir() {
    setExcluindo(true);
    try {
      await removerProcesso(id);
      showToast('Processo removido.', 'success');
      navigate('/processos');
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível remover o processo.', 'error');
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  }

  if (loading) return <LoadingState label="Carregando processo..." />;
  if (error || !processo) return <ErrorState message={error || 'Processo não encontrado.'} onRetry={reload} />;

  return (
    <>
      <Header
        title={processo.numero_processo}
        subtitle={`${processo.nome_tribunal} - ${processo.nome_comarca} - ${processo.nome_vara}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/processos/${id}/editar`)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="danger" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        }
      />

      <div className="border-b border-slate-200 bg-white px-8">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAba(tab.key)}
              className={`border-b-2 py-3 text-sm font-medium ${
                aba === tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-8">
        {aba === 'geral' && <VisaoGeralTab processo={processo} />}
        {aba === 'partes' && <PartesTab idProcesso={id} />}
        {aba === 'pedidos' && <PedidosTab idProcesso={id} />}
        {aba === 'decisoes' && <DecisoesTab idProcesso={id} />}
      </div>

      <ConfirmDialog
        open={confirmandoExclusao}
        title="Excluir processo"
        message="Tem certeza que deseja excluir este processo? Essa ação não pode ser desfeita."
        onConfirm={handleExcluir}
        onCancel={() => setConfirmandoExclusao(false)}
        loading={excluindo}
      />
    </>
  );
}
