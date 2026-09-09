import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <FileQuestion className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
      <div>
        <p className="text-lg font-semibold text-slate-900">Página não encontrada</p>
        <p className="text-sm text-slate-500">O endereço acessado não existe.</p>
      </div>
      <Link to="/">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  );
}
