import Card from '../../../components/ui/Card.jsx';
import { SituacaoBadge } from '../../../components/ui/Badge.jsx';
import { formatarData, formatarMoeda } from '../../../utils/formatters.js';

export default function VisaoGeralTab({ processo }) {
  const campos = [
    ['Número', processo.numero_processo],
    ['Categoria', processo.categoria || '-'],
    ['Tribunal', processo.nome_tribunal],
    ['Comarca', processo.nome_comarca],
    ['Vara', processo.nome_vara],
    ['Situação', <SituacaoBadge key="situacao" situacao={processo.nome_situacao} />],
    ['Data de distribuição', formatarData(processo.data_distribuicao)],
    ['Valor da causa', formatarMoeda(processo.valor_causa)],
    ['Juiz', processo.nome_juiz || '-'],
    ['Desembargador', processo.nome_desembargador || '-'],
    ['Ministro', processo.nome_ministro || '-'],
  ];

  return (
    <Card title="Dados do processo">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {campos.map(([label, valor]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm text-slate-800">{valor}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
