import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import * as authService from '../../services/auth.service.js';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await authService.esqueciSenha({ email });
      // o backend sempre responde com sucesso genérico, mesmo se o e-mail
      // não existir - evita revelar quais e-mails estão cadastrados
      setEnviado(true);
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível enviar o link de redefinição.', 'error');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Verifique seu e-mail</h1>
        <p className="mb-6 text-sm text-slate-500">
          Se <strong>{email}</strong> estiver cadastrado, você receberá em instantes um e-mail com o link para
          redefinir sua senha.
        </p>
        <Link to="/login" className="text-sm font-medium text-brand-600 hover:underline">
          Voltar para o login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-slate-500">
        Informe o e-mail de login. Enviaremos um link para você criar uma nova senha.
      </p>

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

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
