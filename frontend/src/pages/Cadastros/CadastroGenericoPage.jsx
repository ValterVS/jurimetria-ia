import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Header from '../../layouts/Header.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { FormField, TextInput, Select } from '../../components/ui/FormField.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  CADASTROS_CONFIG,
  listarCadastro,
  criarCadastro,
  atualizarCadastro,
  removerCadastro,
} from '../../services/cadastros.service.js';

export default function CadastroGenericoPage() {
  const { recurso } = useParams();
  const config = CADASTROS_CONFIG.find((c) => c.chave === recurso);
  const { showToast } = useToast();

  const { data: itens, loading, error, reload } = useApi(() => listarCadastro(recurso), [recurso]);
  const [opcoesPai, setOpcoesPai] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', pai: '' });
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [excluindoCarregando, setExcluindoCarregando] = useState(false);

  useEffect(() => {
    if (config?.paiRecurso) {
      listarCadastro(config.paiRecurso)
        .then((res) => setOpcoesPai(res.items || res))
        .catch(() => {});
    } else {
      setOpcoesPai([]);
    }
  }, [config]);

  if (!config) {
    return (
      <>
        <Header title="Cadastro auxiliar" />
        <div className="p-8">
          <ErrorState message="Cadastro auxiliar desconhecido." />
        </div>
      </>
    );
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: '', pai: '' });
    setModalAberto(true);
  }

  function abrirEdicao(item) {
    setEditando(item);
    setForm({
      nome: item[config.campoNome],
      pai: config.campoPai ? String(item[config.campoPai] ?? '') : '',
    });
    setModalAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setSalvando(true);
    const payload = { [config.campoNome]: form.nome };
    if (config.campoPai) {
      payload[config.campoPai] = form.pai ? Number(form.pai) : null;
    }
    try {
      if (editando) {
        await atualizarCadastro(recurso, editando[config.idField], payload);
        showToast('Registro atualizado.', 'success');
      } else {
        await criarCadastro(recurso, payload);
        showToast('Registro criado.', 'success');
      }
      setModalAberto(false);
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível salvar.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    setExcluindoCarregando(true);
    try {
      await removerCadastro(recurso, excluindo[config.idField]);
      showToast('Registro removido.', 'success');
      setExcluindo(null);
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível remover. Verifique se ele não está em uso.', 'error');
    } finally {
      setExcluindoCarregando(false);
    }
  }

  const colunas = [
    { key: 'nome', header: 'Nome', render: (r) => r[config.campoNome] },
    ...(config.paiLabel
      ? [{ key: 'pai', header: config.paiLabel, render: (r) => r[config.paiNomeField] ?? '-' }]
      : []),
    {
      key: 'acoes',
      header: '',
      render: (r) => (
        <div className="flex gap-3">
          <button onClick={() => abrirEdicao(r)} className="text-slate-400 hover:text-brand-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setExcluindo(r)} className="text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title={config.titulo} actions={<Button onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo</Button>} />
      <div className="p-8">
        {loading && <LoadingState label={`Carregando ${config.titulo.toLowerCase()}...`} />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && itens?.length === 0 && (
          <EmptyState title={`Nenhum registro em ${config.titulo}`} action={<Button onClick={abrirNovo}>Novo registro</Button>} />
        )}
        {!loading && !error && itens?.length > 0 && <Table rowKey={config.idField} columns={colunas} rows={itens} />}
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar registro' : 'Novo registro'}>
        <form onSubmit={handleSalvar}>
          <FormField label="Nome">
            <TextInput required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </FormField>
          {config.campoPai && (
            <FormField label={config.paiLabel}>
              <Select required={!config.paiOpcional} value={form.pai} onChange={(e) => setForm({ ...form, pai: e.target.value })}>
                <option value="">{config.paiOpcional ? 'Nenhum' : 'Selecione...'}</option>
                {opcoesPai.map((o) => (
                  <option key={o[config.paiIdField]} value={o[config.paiIdField]}>
                    {o[config.paiNomeField]}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(excluindo)}
        title="Excluir registro"
        message="Tem certeza que deseja excluir este registro? Se ele estiver em uso, a remoção será bloqueada."
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
        loading={excluindoCarregando}
      />
    </>
  );
}
