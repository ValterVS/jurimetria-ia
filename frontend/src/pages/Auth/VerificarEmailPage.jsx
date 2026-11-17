import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import * as authService from '../../services/auth.service.js';

export default function VerificarEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { entrar } = useAuth();

  const [email, setEmail] = useState(location.state?.email || '');
  const [codigo, setCodigo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setConfirmando(true);
    try {
      const dados = await authService.verificarEmail({ email, codigo });
      entrar(dados);
      showToast('E-mail verificado com sucesso.', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível verificar o código.', 'error');
    } finally {
      setConfirmando(false);
    }
  }

  async function handleReenviar() {
    if (!email) {
      showToast('Informe o e-mail usado no cadastro.', 'error');
      return;
    }
    setReenviando(true);
    try {
      await authService.reenviarCodigo({ email });
      showToast('Novo código enviado para o seu e-mail.', 'success');
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível reenviar o código.', 'error');
    } finally {
      setReenviando(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Verifique seu e-mail</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enviamos um código de 6 dígitos para o e-mail informado no cadastro.
      </p>

      <form onSubmit={handleSubmit}>
        <FormField label="E-mail">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
          />
        </FormField>
        <FormField label="Código de verificação">
          <TextInput
            required
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={confirmando}>
          {confirmando ? 'Confirmando...' : 'Confirmar e entrar'}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleReenviar}
        disabled={reenviando}
        className="mt-4 w-full text-center text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
      >
        {reenviando ? 'Reenviando...' : 'Reenviar código'}
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
