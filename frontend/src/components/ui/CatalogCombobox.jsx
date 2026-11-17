import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400';

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function distancia(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// parecido o bastante para sugerir ("Linz" -> "Lins"): compara a consulta com
// o nome inteiro e com cada palavra do nome, tolerando ~1 erro a cada 4 letras
function parecido(consulta, nome) {
  if (consulta.length < 3) return false;
  const limite = Math.max(1, Math.floor(consulta.length / 4));
  return [nome, ...nome.split(' ')].some((trecho) => distancia(consulta, trecho) <= limite);
}

/**
 * Lista suspensa com busca (ignora maiúscula/acento, sugere nomes parecidos)
 * que permite cadastrar na hora o item que não existe.
 *
 * options: [{ id, nome }]   value: id selecionado ('' se nenhum)
 * onChange(id)              onCreate(nome) => Promise<{ id, nome }> (opcional)
 */
export default function CatalogCombobox({
  label,
  hint,
  options,
  value,
  onChange,
  onCreate,
  disabled = false,
  required = false,
  placeholder = 'Digite para buscar ou cadastrar...',
}) {
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [consulta, setConsulta] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const [criando, setCriando] = useState(false);

  const selecionado = useMemo(
    () => options.find((o) => String(o.id) === String(value)) || null,
    [options, value]
  );

  // mantém o texto do campo em sincronia com o item selecionado
  useEffect(() => {
    setConsulta(selecionado ? selecionado.nome : '');
  }, [selecionado]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? 'Selecione ou cadastre um item da lista.' : '');
  }, [required, value]);

  const chave = normalizar(consulta);
  const buscando = aberto && chave !== '' && chave !== normalizar(selecionado?.nome);

  const filtradas = useMemo(() => {
    if (!buscando) return options;
    const contem = options.filter((o) => normalizar(o.nome).includes(chave));
    const semelhantes = options.filter(
      (o) => !contem.includes(o) && parecido(chave, normalizar(o.nome))
    );
    return [...contem, ...semelhantes];
  }, [options, chave, buscando]);

  const existenteExato = options.find((o) => normalizar(o.nome) === chave);
  const podeCriar = Boolean(onCreate) && chave !== '' && !existenteExato;

  // itens navegáveis: as opções filtradas + (opcionalmente) "cadastrar novo"
  const totalItens = filtradas.length + (podeCriar ? 1 : 0);

  useEffect(() => {
    function fecharAoClicarFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
        setConsulta(selecionado ? selecionado.nome : '');
      }
    }
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, [selecionado]);

  function selecionar(opcao) {
    onChange(opcao.id);
    setConsulta(opcao.nome);
    setAberto(false);
  }

  async function cadastrar() {
    if (!podeCriar || criando) return;
    setCriando(true);
    try {
      const criado = await onCreate(consulta.trim());
      selecionar(criado);
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível cadastrar.', 'error');
    } finally {
      setCriando(false);
    }
  }

  function escolherDestaque() {
    if (destaque < filtradas.length) selecionar(filtradas[destaque]);
    else cadastrar();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setDestaque((d) => Math.min(d + 1, Math.max(totalItens - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === 'Enter' && aberto && totalItens > 0) {
      e.preventDefault();
      escolherDestaque();
    } else if (e.key === 'Escape') {
      setAberto(false);
      setConsulta(selecionado ? selecionado.nome : '');
    }
  }

  return (
    <div className="mb-4 text-sm" ref={containerRef}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          ref={inputRef}
          className={inputClass}
          value={consulta}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setAberto(true);
            setDestaque(0);
          }}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAberto(true);
            setDestaque(0);
            // campo esvaziado = limpar a seleção (útil nos campos opcionais)
            if (e.target.value === '' && value) onChange('');
          }}
          onKeyDown={handleKeyDown}
        />

        {aberto && !disabled && (filtradas.length > 0 || podeCriar) && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {filtradas.map((opcao, i) => {
              const parecidoApenas = buscando && !normalizar(opcao.nome).includes(chave);
              return (
                <li key={opcao.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selecionar(opcao)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      i === destaque ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opcao.nome}</span>
                    {parecidoApenas && <span className="text-xs text-slate-400">você quis dizer?</span>}
                  </button>
                </li>
              );
            })}
            {podeCriar && (
              <li className={filtradas.length > 0 ? 'border-t border-slate-100' : ''}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cadastrar}
                  disabled={criando}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${
                    destaque === filtradas.length ? 'bg-brand-50 text-brand-700' : 'text-brand-600 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  {criando ? 'Cadastrando...' : `Cadastrar "${consulta.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </div>
  );
}
