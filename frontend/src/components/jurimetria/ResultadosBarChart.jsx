import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Barra horizontal empilhada (procedentes/improcedentes/parciais) para
// comparar rapidamente pedidos, juízes, desembargadores ou tribunais.
// Mostra sempre CONTAGENS históricas, nunca uma previsão.
export default function ResultadosBarChart({ data, limite = 10 }) {
  const ordenado = [...data].sort((a, b) => b.total_analisados - a.total_analisados).slice(0, limite);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, ordenado.length * 42)}>
      <BarChart data={ordenado} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="nome" width={170} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="procedentes" stackId="r" name="Procedente" fill="#10b981" />
        <Bar dataKey="improcedentes" stackId="r" name="Improcedente" fill="#ef4444" />
        <Bar dataKey="parciais" stackId="r" name="Parcial" fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
