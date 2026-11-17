import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { FormField, Select, TextInput } from '../../../components/ui/FormField.jsx';
import LoadingState from '../../../components/ui/LoadingState.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { ResultadoBadge } from '../../../components/ui/Badge.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import {
  listarPedidosDoProcesso,
  vincularPedidoAoProcesso,
  removerPedidoDoProcesso,
} from '../../../services/processos.service.js';
import { listarPedidos, criarPedido } from '../../../services/pedidos.service.js';
import { formatarMoeda } from '../../../utils/formatters.js';

export default function PedidosTab({ idProcesso }) {
  const { showToast } = useToast();
  const { data: pedidosVinculados, loading, reload } = useApi(() => listarPedidosDoProcesso(idProcesso), [idProcesso]);

  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [modoNovoPedido, setModoNovoPedido] = useState(false);
  const [form, setForm] = useState({ id_pedido: '', nome_pedido: '', descricao: '', valor: '' });

  function abrirModal() {
    setForm({ id_pedido: '', nome_pedido: '', descricao: '', valor: '' });
    setModoNovoPedido(false);
    listarPedidos({ limit: 100 })
      .then((res) => setTodosPedidos(res.items || res))
      .catch(() => showToast('Não foi possível carregar os pedidos.', 'error'));
    setModalAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      let idPedido = form.id_pedido;
      if (modoNovoPedido) {
        const novo = await criarPedido({ nome_pedido: form.nome_pedido });
        idPedido = novo.id_pedido;
      }
      await vincularPedidoAoProcesso(idProcesso, {
        id_pedido: Number(idPedido),
        descricao: form.descricao.trim() === '' ? null : form.descricao.trim(),
        valor: form.valor === '' ? null : Number(form.valor),
      });
      showToast('Pedido vinculado ao processo.', 'success');
      setModalAberto(false);
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível vincular o pedido.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(idVinculo) {
    try {
      await removerPedidoDoProcesso(idProcesso, idVinculo);
      showToast('Pedido desvinculado.', 'success');
      reload();
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível desvincular o pedido.', 'error');
    }
  }

  if (loading) return <LoadingState label="Carregando pedidos..." />;

  return (
    <Card title="Pedidos do processo" actions={<Button onClick={abrirModal}><Plus className="h-4 w-4" /> Vincular pedido</Button>}>
      {pedidosVinculados.length === 0 ? (
        <EmptyState
          title="Nenhum pedido vinculado"
          description="Vincule todos os pedidos deste processo antes de registrar uma sentença ou acórdão. Depois da análise de IA, o resultado, o juiz e o relator são preenchidos automaticamente; pedidos que a IA encontrar e não estiverem aqui são adicionados."
        />
      ) : (
        <Table
          rowKey="id_processo_pedido"
          columns={[
            {
              key: 'nome_pedido',
              header: 'Pedido',
              render: (r) => (
                <div>
                  <div>{r.nome_pedido}</div>
                  {r.descricao && <div className="text-xs text-slate-500">{r.descricao}</div>}
                </div>
              ),
            },
            { key: 'valor', header: 'Valor', render: (r) => formatarMoeda(r.valor) },
            {
              key: 'resultado',
              header: 'Resultado atual',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <ResultadoBadge resultado={r.resultado} />
                  {r.reformado && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Reformado
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'nome_juiz',
              header: 'Juiz (1º grau)',
              render: (r) =>
                r.nome_juiz ? (
                  <div>
                    <div>{r.nome_juiz}</div>
                    {r.resultado_sentenca && <ResultadoBadge resultado={r.resultado_sentenca} />}
                  </div>
                ) : (
                  <span className="text-slate-400">Aguardando análise</span>
                ),
            },
            {
              key: 'nome_desembargador',
              header: 'Relator (2º grau)',
              render: (r) =>
                r.nome_desembargador ? (
                  <div>
                    <div>{r.nome_desembargador}</div>
                    {r.resultado_acordao && <ResultadoBadge resultado={r.resultado_acordao} />}
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                ),
            },
            {
              key: 'acoes',
              header: '',
              render: (r) => (
                <button onClick={() => handleRemover(r.id_processo_pedido)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          rows={pedidosVinculados}
        />
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Vincular pedido">
        <form onSubmit={handleSalvar}>
          <div className="mb-4 flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setModoNovoPedido(false)}
              className={`rounded-lg px-3 py-1.5 ${!modoNovoPedido ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}
            >
              Pedido existente
            </button>
            <button
              type="button"
              onClick={() => setModoNovoPedido(true)}
              className={`rounded-lg px-3 py-1.5 ${modoNovoPedido ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}
            >
              Novo pedido
            </button>
          </div>

          {!modoNovoPedido ? (
            <FormField label="Pedido">
              <Select required value={form.id_pedido} onChange={(e) => setForm({ ...form, id_pedido: e.target.value })}>
                <option value="">Selecione...</option>
                {todosPedidos.map((p) => (
                  <option key={p.id_pedido} value={p.id_pedido}>
                    {p.nome_pedido}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Nome do pedido">
              <TextInput
                required
                value={form.nome_pedido}
                onChange={(e) => setForm({ ...form, nome_pedido: e.target.value })}
                placeholder="Ex: Horas extras"
              />
            </FormField>
          )}

          <FormField
            label="Descrição / fundamento"
            hint="Opcional. Use para diferenciar pedidos de mesmo nome (ex.: danos morais pela rescisão x dano existencial)"
          >
            <TextInput
              maxLength={300}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: em razão da rescisão"
            />
          </FormField>

          <FormField label="Valor" hint="Opcional">
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
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
