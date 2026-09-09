import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../layouts/Header.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput, Select } from '../../components/ui/FormField.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { buscarProcesso, criarProcesso, atualizarProcesso } from '../../services/processos.service.js';
import { listarCadastro } from '../../services/cadastros.service.js';

const ESTADO_INICIAL = {
  numero_processo: '',
  categoria: '',
  id_tribunal: '',
  id_comarca: '',
  id_vara: '',
  data_distribuicao: '',
  valor_causa: '',
  id_situacao: '',
};

export default function ProcessoFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(ESTADO_INICIAL);
  const [tribunais, setTribunais] = useState([]);
  const [comarcas, setComarcas] = useState([]);
  const [varas, setVaras] = useState([]);
  const [situacoes, setSituacoes] = useState([]);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarCadastro('tribunais')
      .then(setTribunais)
      .catch(() => showToast('Não foi possível carregar os tribunais.', 'error'));
    listarCadastro('situacoes-processo')
      .then(setSituacoes)
      .catch(() => showToast('Não foi possível carregar as situações.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editando) return;
    buscarProcesso(id)
      .then((processo) => {
        setForm({
          numero_processo: processo.numero_processo,
          categoria: processo.categoria || '',
          id_tribunal: String(processo.id_tribunal),
          id_comarca: String(processo.id_comarca),
          id_vara: String(processo.id_vara),
          data_distribuicao: processo.data_distribuicao ? processo.data_distribuicao.slice(0, 10) : '',
          valor_causa: processo.valor_causa ?? '',
          id_situacao: String(processo.id_situacao),
        });
        setCarregando(false);
      })
      .catch(() => {
        showToast('Não foi possível carregar o processo.', 'error');
        setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, id]);

  useEffect(() => {
    if (!form.id_tribunal) {
      setComarcas([]);
      return;
    }
    listarCadastro('comarcas', { id_tribunal: form.id_tribunal }).then(setComarcas);
  }, [form.id_tribunal]);

  useEffect(() => {
    if (!form.id_comarca) {
      setVaras([]);
      return;
    }
    listarCadastro('varas', { id_comarca: form.id_comarca }).then(setVaras);
  }, [form.id_comarca]);

  function handleChange(campo, valor) {
    setForm((prev) => {
      const novo = { ...prev, [campo]: valor };
      if (campo === 'id_tribunal') {
        novo.id_comarca = '';
        novo.id_vara = '';
      }
      if (campo === 'id_comarca') {
        novo.id_vara = '';
      }
      return novo;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      numero_processo: form.numero_processo,
      categoria: form.categoria || null,
      id_tribunal: Number(form.id_tribunal),
      id_comarca: Number(form.id_comarca),
      id_vara: Number(form.id_vara),
      data_distribuicao: form.data_distribuicao,
      valor_causa: form.valor_causa === '' ? null : Number(form.valor_causa),
      id_situacao: Number(form.id_situacao),
    };
    try {
      if (editando) {
        await atualizarProcesso(id, payload);
        showToast('Processo atualizado com sucesso.', 'success');
        navigate(`/processos/${id}`);
      } else {
        const criado = await criarProcesso(payload);
        showToast('Processo cadastrado com sucesso.', 'success');
        navigate(`/processos/${criado.id_processo}`);
      }
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível salvar o processo.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <LoadingState label="Carregando processo..." />;

  return (
    <>
      <Header title={editando ? 'Editar processo' : 'Novo processo'} />
      <div className="p-8">
        <Card>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <FormField label="Número do processo">
              <TextInput
                required
                value={form.numero_processo}
                onChange={(e) => handleChange('numero_processo', e.target.value)}
              />
            </FormField>
            <FormField label="Categoria" hint="Opcional">
              <TextInput
                value={form.categoria}
                onChange={(e) => handleChange('categoria', e.target.value)}
                placeholder="Ex: Trabalhista"
              />
            </FormField>
            <FormField label="Tribunal">
              <Select required value={form.id_tribunal} onChange={(e) => handleChange('id_tribunal', e.target.value)}>
                <option value="">Selecione...</option>
                {tribunais.map((t) => (
                  <option key={t.id_tribunal} value={t.id_tribunal}>
                    {t.nome_tribunal}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Comarca">
              <Select
                required
                disabled={!form.id_tribunal}
                value={form.id_comarca}
                onChange={(e) => handleChange('id_comarca', e.target.value)}
              >
                <option value="">Selecione...</option>
                {comarcas.map((c) => (
                  <option key={c.id_comarca} value={c.id_comarca}>
                    {c.nome_comarca}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Vara">
              <Select
                required
                disabled={!form.id_comarca}
                value={form.id_vara}
                onChange={(e) => handleChange('id_vara', e.target.value)}
              >
                <option value="">Selecione...</option>
                {varas.map((v) => (
                  <option key={v.id_vara} value={v.id_vara}>
                    {v.nome_vara}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Situação">
              <Select required value={form.id_situacao} onChange={(e) => handleChange('id_situacao', e.target.value)}>
                <option value="">Selecione...</option>
                {situacoes.map((s) => (
                  <option key={s.id_situacao} value={s.id_situacao}>
                    {s.nome_situacao}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data de distribuição">
              <TextInput
                type="date"
                required
                value={form.data_distribuicao}
                onChange={(e) => handleChange('data_distribuicao', e.target.value)}
              />
            </FormField>
            <FormField label="Valor da causa" hint="Opcional">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={form.valor_causa}
                onChange={(e) => handleChange('valor_causa', e.target.value)}
              />
            </FormField>

            <div className="col-span-full mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Card>
        <p className="mt-3 text-xs text-slate-400">
          Juiz, desembargador e ministro do processo podem ser definidos ao cadastrar cada sentença/acórdão.
        </p>
      </div>
    </>
  );
}
