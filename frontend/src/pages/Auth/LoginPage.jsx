import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import * as authService from '../../services/auth.service.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const { showToast } = useToast();
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setEntrando(true);
    try {
      const dados = await authService.login({ email, senha });
      entrar(dados);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      if (err.response?.status === 403) {
        showToast(err.friendlyMessage, 'error');
        navigate('/verificar-email', { state: { email } });
      } else {
        showToast(err.friendlyMessage || 'Não foi possível entrar.', 'error');
      }
    } finally {
      setEntrando(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Entrar</h1>
      <p className="mb-6 text-sm text-slate-500">Acesse o painel de jurimetria da sua empresa.</p>

      <form onSubmit={handleSubmit}>
        <FormField label="E-mail">
          <TextInput
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
          />
        </FormField>
        <FormField label="Senha">
          <TextInput
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />
        </FormField>

        <div className="mb-4 text-right">
          <Link to="/esqueci-senha" className="text-xs font-medium text-brand-600 hover:underline">
            Esqueci a senha
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={entrando}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-brand-600 hover:underline">
          Cadastre sua empresa
        </Link>
      </p>
    </>
  );
}
