import { Outlet } from 'react-router-dom';
import { Scale } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Scale className="h-7 w-7 text-brand-600" />
          <span className="text-lg font-semibold text-slate-900">Jurimetria IA</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
