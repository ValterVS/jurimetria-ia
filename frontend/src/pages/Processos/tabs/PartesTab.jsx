import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { FormField, Select, TextInput } from '../../../components/ui/FormField.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import {
  listarPartesDoProcesso,
  vincularParteAoProcesso,
  removerParteDoProcesso,
} from '../../../services/processos.service.js';
import { listarPartes, criarParte } from '../../../services/partes.service.js';
import { POLO_OPTIONS } from '../../../utils/constants.js';

export default function PartesTab({ idProcesso }) {
  const { showToast } = useToast();
  const { data: partesVinculadas, loading, reload } = useApi(() => listarPartesDoProcesso(idProcesso), [idProcesso]);

  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [todasPartes, setTodasPartes] = useState([]);
  const [modoNovaParte, setModoNovaParte] = useState(false);
  const [form, setForm] = useState({ id_parte: '', polo: 'ativo', nome_parte: '', cpf_cnpj: '' });

  function abrirModal() {
    setForm({ id_parte: '', polo: 'ativo', nome_parte: '', cpf_cnpj: '' });
    setModoNovaParte(false);
    listarPartes({ limit: 100 })
      .then((res) => setTodasPartes(res.items || res))
      .catch(() => showToast('Não foi possível carregar as partes.', 'error'));
    setModalAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      let idParte = form.id_parte;
      if (modoNovaParte) {
        const nova = await criarParte({ nome_parte: form.nome_parte, cpf_cnpj: form.cpf_cnpj || null });
        idParte = nova.id_parte;
      }
      await vincularParteAoProcesso(idProcesso, { id_parte: Number(idParte), polo: form.polo });
      showToast('Parte vinculada ao processo.', 'success');
      setModalAberto(false);
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível vincular a parte.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(idParte) {
    try {
      await removerParteDoProcesso(idProcesso, idParte);
      showToast('Parte desvinculada.', 'success');
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível desvincular a parte.', 'error');
    }
  }

  if (loading) return <LoadingState label="Carregando partes..." />;

  return (
    <Card title="Partes do processo" actions={<Button onClick={abrirModal}><Plus className="h-4 w-4" /> Vincular parte</Button>}>
      {partesVinculadas.length === 0 ? (
        <EmptyState title="Nenhuma parte vinculada" description="Vincule as partes envolvidas neste processo." />
      ) : (
        <Table
          rowKey="id_parte"
          columns={[
            { key: 'nome_parte', header: 'Nome' },
            { key: 'cpf_cnpj', header: 'CPF/CNPJ', render: (r) => r.cpf_cnpj || '-' },
            { key: 'nome_tipo', header: 'Tipo', render: (r) => r.nome_tipo || '-' },
            { key: 'polo', header: 'Polo' },
            {
              key: 'acoes',
              header: '',
              render: (r) => (
                <button onClick={() => handleRemover(r.id_parte)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          rows={partesVinculadas}
        />
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Vincular parte">
        <form onSubmit={handleSalvar}>
          <div className="mb-4 flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setModoNovaParte(false)}
              className={`rounded-lg px-3 py-1.5 ${!modoNovaParte ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}
            >
              Parte existente
            </button>
            <button
              type="button"
              onClick={() => setModoNovaParte(true)}
              className={`rounded-lg px-3 py-1.5 ${modoNovaParte ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}
            >
              Nova parte
            </button>
          </div>

          {!modoNovaParte ? (
            <FormField label="Parte">
              <Select required value={form.id_parte} onChange={(e) => setForm({ ...form, id_parte: e.target.value })}>
                <option value="">Selecione...</option>
                {todasPartes.map((p) => (
                  <option key={p.id_parte} value={p.id_parte}>
                    {p.nome_parte}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <>
              <FormField label="Nome">
                <TextInput required value={form.nome_parte} onChange={(e) => setForm({ ...form, nome_parte: e.target.value })} />
              </FormField>
              <FormField label="CPF/CNPJ" hint="Opcional">
                <TextInput value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
              </FormField>
            </>
          )}

          <FormField label="Polo">
            <Select required value={form.polo} onChange={(e) => setForm({ ...form, polo: e.target.value })}>
              {POLO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Vincular'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
