const COLORS = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function Badge({ color = 'slate', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[color]}`}>
      {children}
    </span>
  );
}

const STATUS_ANALISE_COLOR = {
  Pendente: 'amber',
  'Em Análise': 'blue',
  Concluída: 'green',
  Erro: 'red',
};

export function StatusAnaliseBadge({ status }) {
  return <Badge color={STATUS_ANALISE_COLOR[status] || 'slate'}>{status}</Badge>;
}

const RESULTADO_COLOR = {
  procedente: 'green',
  improcedente: 'red',
  parcialmente_procedente: 'amber',
};

const RESULTADO_LABEL = {
  procedente: 'Procedente',
  improcedente: 'Improcedente',
  parcialmente_procedente: 'Parcialmente procedente',
};

export function ResultadoBadge({ resultado }) {
  if (!resultado) return <Badge color="slate">Sem resultado</Badge>;
  return <Badge color={RESULTADO_COLOR[resultado] || 'slate'}>{RESULTADO_LABEL[resultado] || resultado}</Badge>;
}

const SITUACAO_COLOR = {
  'Em andamento': 'blue',
  Suspenso: 'amber',
  Arquivado: 'slate',
  Encerrado: 'green',
};

export function SituacaoBadge({ situacao }) {
  return <Badge color={SITUACAO_COLOR[situacao] || 'slate'}>{situacao}</Badge>;
}
