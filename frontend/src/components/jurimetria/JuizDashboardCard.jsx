import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ResultadoBarras, { BarraChance, CORES_RESULTADO, SeloTendencia } from './ResultadoBarras.jsx';
import { formatarPercentual } from '../../utils/formatters.js';

const ROTULO_FUNDAMENTO = {
  procedente: 'Quando julgou procedente',
  improcedente: 'Quando julgou improcedente',
  parcialmente_procedente: 'Quando julgou parcialmente procedente',
};

function Indicador({ cor, rotulo, valor, detalhe }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} />
        {rotulo}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{valor}</div>
      <div className="text-xs text-slate-400">{detalhe}</div>
    </div>
  );
}

// percentual da tendência (o maior entre as chances)
function percentualDaTendencia(p) {
  if (p.tendencia === 'procedente') return p.chance_procedente;
  if (p.tendencia === 'improcedente') return p.chance_improcedente;
  if (p.tendencia === 'parcialmente_procedente') return p.chance_parcial;
  return undefined;
}

// "Por que decidiu assim": exemplos de fundamentação, agrupados por resultado
function Fundamentos({ fundamentos }) {
  const [aberto, setAberto] = useState(false);
  if (!fundamentos || fundamentos.length === 0) return null;

  const grupos = ['improcedente', 'procedente', 'parcialmente_procedente']
    .map((resultado) => [resultado, fundamentos.filter((f) => f.resultado === resultado)])
    .filter(([, itens]) => itens.length > 0);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="text-xs font-medium text-brand-700 hover:underline"
      >
        {aberto ? 'Ocultar fundamentos' : 'Por que decidiu assim?'}
      </button>
      {aberto && (
        <div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-3">
          {grupos.map(([resultado, itens]) => (
            <div key={resultado}>
              <div className="mb-1 text-xs font-semibold text-slate-600">{ROTULO_FUNDAMENTO[resultado]}</div>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                {itens.map((f, i) => (
                  <li key={i} className="break-words">
                    {f.texto}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            Resumos extraídos pela IA das decisões mais recentes - servem de pista dos argumentos que o julgador
            costuma acolher ou afastar, não de recomendação de estratégia.
          </p>
        </div>
      )}
    </div>
  );
}

// Resumo de um julgador (juiz de 1º grau ou desembargador/relator de 2º grau):
// a chance histórica de cada resultado por pedido, calculada sobre os pedidos
// que tiveram resultado. Contagens históricas, não é previsão.
export default function JuizDashboardCard({ juiz, defaultOpen = false }) {
  const [aberto, setAberto] = useState(defaultOpen);
  const Seta = aberto ? ChevronDown : ChevronRight;
  const nome = juiz.nome_juiz ?? juiz.nome_desembargador;
  const temReformados = juiz.reformados !== undefined;

  const linhas = juiz.pedidos.map((p) => ({
    chave: p.id_pedido,
    nome: p.nome_pedido,
    procedentes: p.procedentes,
    improcedentes: p.improcedentes,
    parciais: p.parciais,
    sem_resultado: p.sem_resultado,
    reformados: p.reformados,
    amostra_pequena: p.amostra_pequena,
    tendencia: p.tendencia,
    percentualTendencia: percentualDaTendencia(p),
    extra: <Fundamentos fundamentos={p.fundamentos} />,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <Seta className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">{nome}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="w-44">
            <BarraChance
              procedentes={juiz.procedentes}
              improcedentes={juiz.improcedentes}
              parciais={juiz.parciais}
              altura="h-2"
            />
          </span>
          {juiz.decididos} pedido(s) decidido(s)
          {temReformados && ` · ${juiz.reformados} reforma(s)`}
        </span>
      </button>

      {aberto && (
        <div className="space-y-5 border-t border-slate-100 px-5 py-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Indicador
              cor={CORES_RESULTADO.procedentes}
              rotulo="Procedente"
              valor={formatarPercentual(juiz.chance_procedente)}
              detalhe={`${juiz.procedentes} de ${juiz.decididos} decididos`}
            />
            <Indicador
              cor={CORES_RESULTADO.improcedentes}
              rotulo="Improcedente"
              valor={formatarPercentual(juiz.chance_improcedente)}
              detalhe={`${juiz.improcedentes} de ${juiz.decididos} decididos`}
            />
            <Indicador
              cor={CORES_RESULTADO.parciais}
              rotulo="Parcialmente procedente"
              valor={formatarPercentual(juiz.chance_parcial)}
              detalhe={`${juiz.parciais} de ${juiz.decididos} decididos`}
            />
            <Indicador
              cor={CORES_RESULTADO.sem_resultado}
              rotulo="Sem resultado"
              valor={juiz.sem_resultado}
              detalhe="não entram no percentual"
            />
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-700">Chance histórica por pedido</h4>
              <SeloTendencia tendencia={juiz.tendencia} percentual={percentualDaTendencia(juiz)} />
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Percentuais sobre os pedidos que tiveram resultado. Com poucas decisões o número é só um indício.
            </p>
            <ResultadoBarras linhas={linhas} />
          </div>
        </div>
      )}
    </div>
  );
}
