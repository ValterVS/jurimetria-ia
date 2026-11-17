import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { FormField, TextInput } from '../../components/ui/FormField.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import * as authService from '../../services/auth.service.js';

// máscara simples de CNPJ enquanto o usuário digita (00.000.000/0000-00)
function maskCnpj(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// máscara simples de CPF enquanto o usuário digita (000.000.000-00)
function maskCpf(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

const MASKS = { cnpj: maskCnpj, cpf_responsavel: maskCpf };

export default function CadastroPage() {
  const [form, setForm] = useState({
    cnpj: '',
    nome_empresa: '',
    nome_responsavel: '',
    cpf_responsavel: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });
  const [enviando, setEnviando] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleChange(campo, valor) {
    const mask = MASKS[campo];
    setForm((prev) => ({ ...prev, [campo]: mask ? mask(valor) : valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.senha !== form.confirmarSenha) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    if (form.senha.length < 8) {
      showToast('A senha deve ter no mínimo 8 caracteres.', 'error');
      return;
    }

    setEnviando(true);
    try {
      await authService.cadastrar({
        cnpj: form.cnpj,
        nome_empresa: form.nome_empresa,
        nome_responsavel: form.nome_responsavel,
        cpf_responsavel: form.cpf_responsavel,
        email: form.email,
        senha: form.senha,
      });
      showToast('Cadastro criado. Enviamos um código de verificação para o seu e-mail.', 'success');
      navigate('/verificar-email', { state: { email: form.email } });
    } catch (err) {
      showToast(err.friendlyMessage || 'Não foi possível concluir o cadastro.', 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Cadastrar empresa</h1>
      <p className="mb-6 text-sm text-slate-500">Crie o acesso da sua empresa ao sistema de jurimetria.</p>

      <form onSubmit={handleSubmit}>
        <FormField label="CNPJ">
          <TextInput
            required
            autoFocus
            inputMode="numeric"
            value={form.cnpj}
            onChange={(e) => handleChange('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </FormField>
        <FormField label="Nome da empresa">
          <TextInput
            required
            value={form.nome_empresa}
            onChange={(e) => handleChange('nome_empresa', e.target.value)}
          />
        </FormField>
        <FormField label="Nome do responsável pelo cadastro">
          <TextInput
            required
            value={form.nome_responsavel}
            onChange={(e) => handleChange('nome_responsavel', e.target.value)}
            placeholder="Nome completo"
          />
        </FormField>
        <FormField label="CPF do responsável">
          <TextInput
            required
            inputMode="numeric"
            value={form.cpf_responsavel}
            onChange={(e) => handleChange('cpf_responsavel', e.target.value)}
            placeholder="000.000.000-00"
          />
        </FormField>
        <FormField label="E-mail">
          <TextInput
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="voce@empresa.com"
          />
        </FormField>
        <FormField label="Senha" hint="Mínimo de 8 caracteres">
          <TextInput
            type="password"
            required
            minLength={8}
            value={form.senha}
            onChange={(e) => handleChange('senha', e.target.value)}
          />
        </FormField>
        <FormField label="Confirmar senha">
          <TextInput
            type="password"
            required
            minLength={8}
            value={form.confirmarSenha}
            onChange={(e) => handleChange('confirmarSenha', e.target.value)}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Cadastrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
