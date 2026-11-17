import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BarChart3, Scale, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/processos', label: 'Processos', icon: FolderKanban },
  { to: '/jurimetria', label: 'Jurimetria', icon: BarChart3 },
];

const CADASTROS_NAV = [
  { to: '/cadastros/tribunais', label: 'Tribunais' },
  { to: '/cadastros/comarcas', label: 'Comarcas' },
  { to: '/cadastros/varas', label: 'Varas' },
  { to: '/cadastros/juizes', label: 'Juízes' },
  { to: '/cadastros/desembargadores', label: 'Desembargadores' },
  { to: '/cadastros/ministros', label: 'Ministros' },
  { to: '/cadastros/tipos-parte', label: 'Tipos de Parte' },
  { to: '/cadastros/tipos-sentenca', label: 'Tipos de Sentença' },
  { to: '/cadastros/tipos-acordao', label: 'Tipos de Acórdão' },
  { to: '/cadastros/situacoes-processo', label: 'Situações' },
];

export default function Sidebar() {
  const { empresa, sair } = useAuth();
  const navigate = useNavigate();

  function handleSair() {
    sair();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <Scale className="h-6 w-6 text-brand-600" />
        <span className="text-base font-semibold text-slate-900">Jurimetria IA</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cadastros auxiliares
          </p>
          {CADASTROS_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-1.5 text-sm ${
                  isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:bg-slate-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {empresa && (
        <div className="border-t border-slate-200 px-3 py-3">
          <p className="truncate px-2 text-sm font-medium text-slate-700" title={empresa.nome_empresa}>
            {empresa.nome_empresa}
          </p>
          <p className="truncate px-2 pb-2 text-xs text-slate-400" title={empresa.email}>
            {empresa.email}
          </p>
          <button
            type="button"
            onClick={handleSair}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </aside>
  );
}
