import { formatarPercentual } from '../../utils/formatters.js';

export const CORES_RESULTADO = {
  procedentes: '#10b981',
  improcedentes: '#ef4444',
  parciais: '#f59e0b',
  sem_resultado: '#94a3b8',
};

export const ROTULO_TENDENCIA = {
  procedente: 'procedente',
  improcedente: 'improcedente',
  parcialmente_procedente: 'parcialmente procedente',
};

const COR_TENDENCIA = {
  procedente: 'bg-emerald-100 text-emerald-800',
  improcedente: 'bg-red-100 text-red-800',
  parcialmente_procedente: 'bg-amber-100 text-amber-800',
};

// Barra 100% empilhada: a largura de cada trecho é a chance histórica daquele
// resultado entre os pedidos que tiveram resultado. Não é previsão.
export function BarraChance({ procedentes, improcedentes, parciais, altura = 'h-6' }) {
  const decididos = procedentes + improcedentes + parciais;
  if (decididos === 0) {
    return (
      <div className={`flex ${altura} items-center rounded-md bg-slate-100 px-2 text-xs text-slate-400`}>
        sem pedidos decididos
      </div>
    );
  }

  const partes = [
    ['procedentes', procedentes],
    ['improcedentes', improcedentes],
    ['parciais', parciais],
  ];

  return (
    <div className={`flex ${altura} overflow-hidden rounded-md bg-slate-100`}>
      {partes.map(([chave, qtd]) => {
        if (qtd === 0) return null;
        const pct = (qtd / decididos) * 100;
        return (
          <div
            key={chave}
            title={`${qtd} de ${decididos}`}
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${pct}%`, backgroundColor: CORES_RESULTADO[chave] }}
          >
            {pct >= 14 ? formatarPercentual(pct) : ''}
          </div>
        );
      })}
    </div>
  );
}

export function SeloTendencia({ tendencia, percentual }) {
  if (!tendencia) return <span className="text-xs text-slate-400">sem tendência definida</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_TENDENCIA[tendencia]}`}>
      tende a {ROTULO_TENDENCIA[tendencia]}
      {percentual !== undefined ? ` (${formatarPercentual(percentual)})` : ''}
    </span>
  );
}

export function Legenda() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
      {[
        ['procedentes', 'Procedente'],
        ['improcedentes', 'Improcedente'],
        ['parciais', 'Parcialmente procedente'],
      ].map(([chave, rotulo]) => (
        <span key={chave} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CORES_RESULTADO[chave] }} />
          {rotulo}
        </span>
      ))}
    </div>
  );
}

// Lista de barras: um pedido por linha. O nome quebra em várias linhas em vez
// de ser cortado ou sobrepor o texto vizinho. Cada linha pode trazer `extra`
// (conteúdo abaixo da barra, ex.: fundamentos).
export default function ResultadoBarras({ linhas }) {
  return (
    <div className="space-y-3">
      <Legenda />
      <ul className="divide-y divide-slate-100">
        {linhas.map((l) => {
          const decididos = l.procedentes + l.improcedentes + l.parciais;
          return (
            <li key={l.chave} className="py-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:gap-4">
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-slate-800">{l.nome}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{decididos} decidido(s)</span>
                    {l.amostra_pequena && decididos > 0 && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">amostra pequena</span>
                    )}
                    {l.sem_resultado > 0 && <span>{l.sem_resultado} sem resultado</span>}
                    {l.reformados > 0 && <span>{l.reformados} reforma(s)</span>}
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <BarraChance procedentes={l.procedentes} improcedentes={l.improcedentes} parciais={l.parciais} />
                  {l.tendencia !== undefined && (
                    <SeloTendencia tendencia={l.tendencia} percentual={l.percentualTendencia} />
                  )}
                </div>
              </div>
              {l.extra}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
