import Table from '../ui/Table.jsx';
import { formatarMoeda, formatarPercentual } from '../../utils/formatters.js';

export default function ResultadosTable({ data, mostrarValorMedio = false }) {
  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'total_analisados', header: 'Julgados' },
    { key: 'procedentes', header: 'Procedentes' },
    { key: 'improcedentes', header: 'Improcedentes' },
    { key: 'parciais', header: 'Parciais' },
    {
      key: 'percentual_procedencia',
      header: '% Procedência',
      render: (r) => formatarPercentual(r.percentual_procedencia),
    },
    ...(mostrarValorMedio
      ? [{ key: 'valor_medio', header: 'Valor médio', render: (r) => formatarMoeda(r.valor_medio) }]
      : []),
  ];

  return <Table rowKey="id" columns={columns} rows={data} />;
}
