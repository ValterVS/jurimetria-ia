import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../layouts/Header.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { FormField, Select, TextInput, Textarea } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { criarAcordao } from '../../services/processos.service.js';
import { analisarAcordao } from '../../services/acordaos.service.js';
import { listarCadastro } from '../../services/cadastros.service.js';
import CatalogCombobox from '../../components/ui/CatalogCombobox.jsx';
import useCadastroNaHora, { paraOpcoes } from '../../hooks/useCadastroNaHora.js';

export default function AdicionarAcordaoPage() {
  const { id: idProcesso } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const cadastrarNaHora = useCadastroNaHora();

  const [etapa, setEtapa] = useState('dados');
  const [acordao, setAcordao] = useState(null);
  const [desembargadores, setDesembargadores] = useState([]);
  const [tiposAcordao, setTiposAcordao] = useState([]);
  const [tribunais, setTribunais] = useState([]);
  const [form, setForm] = useState({
    id_relator: '',
    id_desembargador1: '',
    id_desembargador2: '',
    id_tipo_acordao: '',
    data_acordao: '',
    id_tribunal: '',
    reforma_sentenca: '',
  });
  const [salvando, setSalvando] = useState(false);

  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviandoAnalise, setEnviandoAnalise] = useState(false);

  useEffect(() => {
    listarCadastro('desembargadores')
      .then((res) => setDesembargadores(res.items || res))
      .catch(() => showToast('Não foi possível carregar os desembargadores.', 'error'));
    listarCadastro('tipos-acordao')
      .then((res) => setTiposAcordao(res.items || res))
      .catch(() => showToast('Não foi possível carregar os tipos de acórdão.', 'error'));
    listarCadastro('tribunais')
      .then((res) => setTribunais(res.items || res))
      .catch(() => showToast('Não foi possível carregar os tribunais.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idStr = (id) => (id === '' ? '' : String(id));

  const criarDesembargador = (nome) =>
    cadastrarNaHora({
      recurso: 'desembargadores',
      payload: { nome_desembargador: nome },
      campoNome: 'nome_desembargador',
      idField: 'id_desembargador',
      setLista: setDesembargadores,
      rotulo: 'Desembargador',
    });

  async function handleCriarAcordao(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const criado = await criarAcordao(idProcesso, {
        id_relator: form.id_relator || null,
        id_desembargador1: form.id_desembargador1 || null,
        id_desembargador2: form.id_desembargador2 || null,
        id_tipo_acordao: form.id_tipo_acordao ? Number(form.id_tipo_acordao) : null,
        data_acordao: form.data_acordao || null,
        id_tribunal: form.id_tribunal || null,
        reforma_sentenca: form.reforma_sentenca === '' ? null : form.reforma_sentenca === 'true',
      });
      setAcordao(criado);
      setEtapa('analise');
      showToast('Acórdão cadastrado. Agora envie o texto: a IA preenche os campos que ficaram em branco.', 'success');
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível cadastrar o acórdão.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleEnviarAnalise(e) {
    e.preventDefault();
    if (!texto.trim() && !arquivo) {
      showToast('Informe o texto da decisão ou envie um arquivo.', 'error');
      return;
    }
    setEnviandoAnalise(true);
    try {
      const analise = await analisarAcordao(acordao.id_acordao, { texto, arquivo });
      showToast('Análise iniciada. Isso pode levar alguns instantes.', 'success');
      navigate(`/analises/${analise.id_analise}`);
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível iniciar a análise.', 'error');
    } finally {
      setEnviandoAnalise(false);
    }
  }

  return (
    <>
      <Header title="Adicionar acórdão" subtitle={`Processo #${idProcesso}`} />
      <div className="max-w-2xl space-y-6 p-8">
        <Card title="1. Dados do acórdão (todos opcionais)">
          <form onSubmit={handleCriarAcordao}>
            <CatalogCombobox
              label="Tipo de acórdão"
              hint="Opcional - a IA preenche na análise"
              disabled={etapa === 'analise'}
              options={paraOpcoes(tiposAcordao, 'id_tipo_acordao', 'tipo_acordao')}
              value={form.id_tipo_acordao}
              onChange={(id) => setForm({ ...form, id_tipo_acordao: idStr(id) })}
              onCreate={(nome) =>
                cadastrarNaHora({
                  recurso: 'tipos-acordao',
                  payload: { tipo_acordao: nome },
                  campoNome: 'tipo_acordao',
                  idField: 'id_tipo_acordao',
                  setLista: setTiposAcordao,
                  rotulo: 'Tipo de acórdão',
                })
              }
            />
            <CatalogCombobox
              label="Tribunal"
              hint="Opcional - a IA preenche na análise"
              disabled={etapa === 'analise'}
              options={paraOpcoes(tribunais, 'id_tribunal', 'nome_tribunal')}
              value={form.id_tribunal}
              onChange={(id) => setForm({ ...form, id_tribunal: idStr(id) })}
              onCreate={(nome) =>
                cadastrarNaHora({
                  recurso: 'tribunais',
                  payload: { nome_tribunal: nome },
                  campoNome: 'nome_tribunal',
                  idField: 'id_tribunal',
                  setLista: setTribunais,
                  rotulo: 'Tribunal',
                })
              }
            />
            <CatalogCombobox
              label="Relator"
              hint="Opcional - a IA preenche na análise"
              disabled={etapa === 'analise'}
              options={paraOpcoes(desembargadores, 'id_desembargador', 'nome_desembargador')}
              value={form.id_relator}
              onChange={(id) => setForm({ ...form, id_relator: idStr(id) })}
              onCreate={criarDesembargador}
            />
            <CatalogCombobox
              label="Desembargador 1"
              hint="Opcional - a IA preenche na análise"
              disabled={etapa === 'analise'}
              options={paraOpcoes(desembargadores, 'id_desembargador', 'nome_desembargador')}
              value={form.id_desembargador1}
              onChange={(id) => setForm({ ...form, id_desembargador1: idStr(id) })}
              onCreate={criarDesembargador}
            />
            <CatalogCombobox
              label="Desembargador 2"
              hint="Opcional - a IA preenche na análise"
              disabled={etapa === 'analise'}
              options={paraOpcoes(desembargadores, 'id_desembargador', 'nome_desembargador')}
              value={form.id_desembargador2}
              onChange={(id) => setForm({ ...form, id_desembargador2: idStr(id) })}
              onCreate={criarDesembargador}
            />
            <FormField label="Data do acórdão" hint="Opcional - a IA preenche na análise">
              <TextInput
                type="date"
                disabled={etapa === 'analise'}
                value={form.data_acordao}
                onChange={(e) => setForm({ ...form, data_acordao: e.target.value })}
              />
            </FormField>
            <FormField label="Reformou a sentença?" hint="Deixe em branco se ainda não souber - a IA pode identificar isso">
              <Select
                disabled={etapa === 'analise'}
                value={form.reforma_sentenca}
                onChange={(e) => setForm({ ...form, reforma_sentenca: e.target.value })}
              >
                <option value="">Não informado</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </Select>
            </FormField>
            {etapa === 'dados' && (
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar e continuar'}
                </Button>
              </div>
            )}
          </form>
        </Card>

        {etapa === 'analise' && (
          <Card title="2. Enviar para análise por IA">
            <form onSubmit={handleEnviarAnalise}>
              <FormField label="Texto da decisão" hint="Cole o texto, ou envie um arquivo abaixo">
                <Textarea
                  rows={10}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Cole aqui o texto do acórdão..."
                />
              </FormField>
              <FormField label="Ou envie um arquivo" hint="PDF, TXT ou DOCX - até 10MB">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
              </FormField>
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={enviandoAnalise}>
                  {enviandoAnalise ? 'Enviando...' : 'Enviar para análise'}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
