import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../layouts/Header.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput, Textarea } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { criarSentenca } from '../../services/processos.service.js';
import { analisarSentenca } from '../../services/sentencas.service.js';
import { listarCadastro } from '../../services/cadastros.service.js';
import CatalogCombobox from '../../components/ui/CatalogCombobox.jsx';
import useCadastroNaHora, { paraOpcoes } from '../../hooks/useCadastroNaHora.js';

export default function AdicionarSentencaPage() {
  const { id: idProcesso } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const cadastrarNaHora = useCadastroNaHora();

  const [etapa, setEtapa] = useState('dados'); // 'dados' | 'analise'
  const [sentenca, setSentenca] = useState(null);
  const [juizes, setJuizes] = useState([]);
  const [tiposSentenca, setTiposSentenca] = useState([]);
  const [form, setForm] = useState({ id_juiz: '', data_sentenca: '', id_tipo_sentenca: '' });
  const [salvando, setSalvando] = useState(false);

  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviandoAnalise, setEnviandoAnalise] = useState(false);

  useEffect(() => {
    listarCadastro('juizes')
      .then((res) => setJuizes(res.items || res))
      .catch(() => showToast('Não foi possível carregar os juízes.', 'error'));
    listarCadastro('tipos-sentenca')
      .then((res) => setTiposSentenca(res.items || res))
      .catch(() => showToast('Não foi possível carregar os tipos de sentença.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCriarSentenca(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const criada = await criarSentenca(idProcesso, {
        id_juiz: Number(form.id_juiz),
        data_sentenca: form.data_sentenca || null,
        id_tipo_sentenca: Number(form.id_tipo_sentenca),
      });
      setSentenca(criada);
      setEtapa('analise');
      showToast('Sentença cadastrada. Agora envie o texto para análise.', 'success');
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível cadastrar a sentença.', 'error');
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
      const analise = await analisarSentenca(sentenca.id_sentenca, { texto, arquivo });
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
      <Header title="Adicionar sentença" subtitle={`Processo #${idProcesso}`} />
      <div className="max-w-2xl space-y-6 p-8">
        <Card title="1. Dados da sentença">
          <form onSubmit={handleCriarSentenca}>
            <CatalogCombobox
              label="Juiz"
              required
              disabled={etapa === 'analise'}
              options={paraOpcoes(juizes, 'id_juiz', 'nome_juiz')}
              value={form.id_juiz}
              onChange={(id) => setForm({ ...form, id_juiz: id === '' ? '' : String(id) })}
              onCreate={(nome) =>
                cadastrarNaHora({
                  recurso: 'juizes',
                  payload: { nome_juiz: nome },
                  campoNome: 'nome_juiz',
                  idField: 'id_juiz',
                  setLista: setJuizes,
                  rotulo: 'Juiz',
                })
              }
            />
            <CatalogCombobox
              label="Tipo de sentença"
              required
              disabled={etapa === 'analise'}
              options={paraOpcoes(tiposSentenca, 'id_tipo_sentenca', 'tipo_sentenca')}
              value={form.id_tipo_sentenca}
              onChange={(id) => setForm({ ...form, id_tipo_sentenca: id === '' ? '' : String(id) })}
              onCreate={(nome) =>
                cadastrarNaHora({
                  recurso: 'tipos-sentenca',
                  payload: { tipo_sentenca: nome },
                  campoNome: 'tipo_sentenca',
                  idField: 'id_tipo_sentenca',
                  setLista: setTiposSentenca,
                  rotulo: 'Tipo de sentença',
                })
              }
            />
            <FormField label="Data da sentença" hint="Opcional">
              <TextInput
                type="date"
                disabled={etapa === 'analise'}
                value={form.data_sentenca}
                onChange={(e) => setForm({ ...form, data_sentenca: e.target.value })}
              />
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
                  placeholder="Cole aqui o texto da sentença..."
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
