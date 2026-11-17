import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import * as authService from '../../services/auth.service.js';

export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (senha !== confirmarSenha) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    if (senha.length < 8) {
      showToast('A senha deve ter no mínimo 8 caracteres.', 'error');
      return;
    }

    setSalvando(true);
    try {
      await authService.redefinirSenha({ token, senha });
      showToast('Senha redefinida com sucesso. Faça login com a nova senha.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível redefinir a senha.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Link inválido</h1>
        <p className="mb-6 text-sm text-slate-500">
          Este link de redefinição de senha está incompleto. Solicite um novo link.
        </p>
        <Link to="/esqueci-senha" className="text-sm font-medium text-brand-600 hover:underline">
          Solicitar novo link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Definir nova senha</h1>
      <p className="mb-6 text-sm text-slate-500">Escolha uma nova senha de acesso para sua empresa.</p>

      <form onSubmit={handleSubmit}>
        <FormField label="Nova senha" hint="Mínimo de 8 caracteres">
          <TextInput
            type="password"
            required
            autoFocus
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </FormField>
        <FormField label="Confirmar nova senha">
          <TextInput
            type="password"
            required
            minLength={8}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Redefinir senha'}
        </Button>
      </form>
    </>
  );
}
