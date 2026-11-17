const { z } = require('zod');
const { isValidCNPJ } = require('../utils/cnpj');
const { isValidCPF } = require('../utils/cpf');

const senhaSchema = z
  .string({ required_error: 'senha é obrigatória.' })
  .min(8, 'senha deve ter no mínimo 8 caracteres.');

const cadastroSchema = z.object({
  cnpj: z
    .string({ required_error: 'cnpj é obrigatório.' })
    .refine(isValidCNPJ, { message: 'cnpj inválido.' }),
  nome_empresa: z
    .string({ required_error: 'nome_empresa é obrigatório.' })
    .trim()
    .min(1, 'nome_empresa é obrigatório.')
    .max(200, 'nome_empresa deve ter no máximo 200 caracteres.'),
  nome_responsavel: z
    .string({ required_error: 'nome_responsavel é obrigatório.' })
    .trim()
    .min(1, 'nome_responsavel é obrigatório.')
    .max(200, 'nome_responsavel deve ter no máximo 200 caracteres.'),
  cpf_responsavel: z
    .string({ required_error: 'cpf_responsavel é obrigatório.' })
    .refine(isValidCPF, { message: 'cpf_responsavel inválido.' }),
  email: z.string({ required_error: 'email é obrigatório.' }).trim().toLowerCase().email('email inválido.'),
  senha: senhaSchema,
});

const verificarEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('email inválido.'),
  codigo: z.string().trim().length(6, 'código deve ter 6 dígitos.'),
});

const reenviarCodigoSchema = z.object({
  email: z.string().trim().toLowerCase().email('email inválido.'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'email é obrigatório.' }).trim().toLowerCase().email('email inválido.'),
  senha: z.string({ required_error: 'senha é obrigatória.' }).min(1, 'senha é obrigatória.'),
});

const esqueciSenhaSchema = z.object({
  email: z.string().trim().toLowerCase().email('email inválido.'),
});

const redefinirSenhaSchema = z.object({
  token: z.string({ required_error: 'token é obrigatório.' }).min(1),
  senha: senhaSchema,
});

module.exports = {
  cadastroSchema,
  verificarEmailSchema,
  reenviarCodigoSchema,
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
};
