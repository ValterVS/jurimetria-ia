import { useState } from 'react';
import Header from '../../layouts/Header.jsx';
import FiltrosBar from '../../components/jurimetria/FiltrosBar.jsx';
import ResumoSection from '../../components/jurimetria/ResumoSection.jsx';
import PorPedidoTab from './tabs/PorPedidoTab.jsx';
import PorJulgadorTab from './tabs/PorJulgadorTab.jsx';
import PorTribunalTab from './tabs/PorTribunalTab.jsx';

const TABS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'pedidos', label: 'Por Pedido' },
  { key: 'julgadores', label: 'Por Julgador' },
  { key: 'tribunais', label: 'Por Tribunal' },
];

export default function JurimetriaPage() {
  const [aba, setAba] = useState('resumo');
  const [filtros, setFiltros] = useState({});

  return (
    <>
      <Header title="Jurimetria" subtitle="Estatísticas históricas de resultados, por pedido, julgador e tribunal" />
      <div className="space-y-6 p-8">
        <FiltrosBar filtros={filtros} onChange={setFiltros} onLimpar={() => setFiltros({})} />

        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAba(tab.key)}
                className={`border-b-2 py-3 text-sm font-medium ${
                  aba === tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {aba === 'resumo' && <ResumoSection filtros={filtros} />}
        {aba === 'pedidos' && <PorPedidoTab filtros={filtros} />}
        {aba === 'julgadores' && <PorJulgadorTab filtros={filtros} />}
        {aba === 'tribunais' && <PorTribunalTab filtros={filtros} />}
      </div>
    </>
  );
}
