import { useEffect, useState } from 'react';
import { Select, TextInput } from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import { listarCadastro } from '../../services/cadastros.service.js';
import { listarPedidos } from '../../services/pedidos.service.js';

// filtros/onChange são controlados pelo componente pai (JurimetriaPage)
export default function FiltrosBar({ filtros, onChange, onLimpar }) {
  const [tribunais, setTribunais] = useState([]);
  const [comarcas, setComarcas] = useState([]);
  const [varas, setVaras] = useState([]);
  const [juizes, setJuizes] = useState([]);
  const [desembargadores, setDesembargadores] = useState([]);
  const [situacoes, setSituacoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    listarCadastro('tribunais').then((r) => setTribunais(r.items || r)).catch(() => {});
    listarCadastro('juizes').then((r) => setJuizes(r.items || r)).catch(() => {});
    listarCadastro('desembargadores').then((r) => setDesembargadores(r.items || r)).catch(() => {});
    listarCadastro('situacoes-processo').then((r) => setSituacoes(r.items || r)).catch(() => {});
    listarPedidos({ limit: 200 }).then((r) => setPedidos(r.items || r)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filtros.id_tribunal) {
      setComarcas([]);
      return;
    }
    listarCadastro('comarcas', { id_tribunal: filtros.id_tribunal }).then((r) => setComarcas(r.items || r));
  }, [filtros.id_tribunal]);

  useEffect(() => {
    if (!filtros.id_comarca) {
      setVaras([]);
      return;
    }
    listarCadastro('varas', { id_comarca: filtros.id_comarca }).then((r) => setVaras(r.items || r));
  }, [filtros.id_comarca]);

  function set(campo, valor) {
    const novo = { ...filtros, [campo]: valor };
    // "(todos)" = sem filtro: remove a chave em vez de guardar ''
    if (valor === '') delete novo[campo];
    if (campo === 'id_tribunal') {
      delete novo.id_comarca;
      delete novo.id_vara;
    }
    if (campo === 'id_comarca') {
      delete novo.id_vara;
    }
    onChange(novo);
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
      <Select value={filtros.id_tribunal || ''} onChange={(e) => set('id_tribunal', e.target.value)}>
        <option value="">Tribunal (todos)</option>
        {tribunais.map((t) => (
          <option key={t.id_tribunal} value={t.id_tribunal}>
            {t.nome_tribunal}
          </option>
        ))}
      </Select>
      <Select disabled={!filtros.id_tribunal} value={filtros.id_comarca || ''} onChange={(e) => set('id_comarca', e.target.value)}>
        <option value="">Comarca (todas)</option>
        {comarcas.map((c) => (
          <option key={c.id_comarca} value={c.id_comarca}>
            {c.nome_comarca}
          </option>
        ))}
      </Select>
      <Select disabled={!filtros.id_comarca} value={filtros.id_vara || ''} onChange={(e) => set('id_vara', e.target.value)}>
        <option value="">Vara (todas)</option>
        {varas.map((v) => (
          <option key={v.id_vara} value={v.id_vara}>
            {v.nome_vara}
          </option>
        ))}
      </Select>
      <Select value={filtros.id_juiz || ''} onChange={(e) => set('id_juiz', e.target.value)}>
        <option value="">Juiz (todos)</option>
        {juizes.map((j) => (
          <option key={j.id_juiz} value={j.id_juiz}>
            {j.nome_juiz}
          </option>
        ))}
      </Select>
      <Select value={filtros.id_desembargador || ''} onChange={(e) => set('id_desembargador', e.target.value)}>
        <option value="">Desembargador (todos)</option>
        {desembargadores.map((d) => (
          <option key={d.id_desembargador} value={d.id_desembargador}>
            {d.nome_desembargador}
          </option>
        ))}
      </Select>
      <Select value={filtros.id_situacao || ''} onChange={(e) => set('id_situacao', e.target.value)}>
        <option value="">Situação (todas)</option>
        {situacoes.map((s) => (
          <option key={s.id_situacao} value={s.id_situacao}>
            {s.nome_situacao}
          </option>
        ))}
      </Select>
      <Select value={filtros.id_pedido || ''} onChange={(e) => set('id_pedido', e.target.value)}>
        <option value="">Pedido (todos)</option>
        {pedidos.map((p) => (
          <option key={p.id_pedido} value={p.id_pedido}>
            {p.nome_pedido}
          </option>
        ))}
      </Select>
      <TextInput
        type="date"
        value={filtros.data_inicio || ''}
        onChange={(e) => set('data_inicio', e.target.value)}
        title="Data de distribuição - início"
      />
      <TextInput
        type="date"
        value={filtros.data_fim || ''}
        onChange={(e) => set('data_fim', e.target.value)}
        title="Data de distribuição - fim"
      />
      <Button variant="secondary" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
