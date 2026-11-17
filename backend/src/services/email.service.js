const { httpError } = require('../utils/httpError');

const COR_MARCA = '#4f46e5';
const COR_MARCA_ESCURA = '#3730a3';
const COR_FUNDO = '#f8fafc';
const COR_TEXTO = '#334155';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw httpError(
      503,
      'Envio de e-mail não configurado no servidor (defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env).'
    );
  }

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// layout compartilhado dos e-mails, com a identidade visual do sistema
function layoutEmail(conteudoHtml) {
  return `
  <div style="background-color:${COR_FUNDO}; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <tr>
        <td style="background: linear-gradient(135deg, ${COR_MARCA}, ${COR_MARCA_ESCURA}); padding: 24px 32px;">
          <span style="color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 0.3px;">⚖ Jurimetria IA</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 32px; color: ${COR_TEXTO}; font-size: 14px; line-height: 1.6;">
          ${conteudoHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 32px; background: ${COR_FUNDO}; color: #94a3b8; font-size: 12px; text-align: center;">
          Este é um e-mail automático do Sistema de Jurimetria. Se você não reconhece esta solicitação, ignore esta mensagem.
        </td>
      </tr>
    </table>
  </div>`;
}

async function enviarEmail({ to, subject, html }) {
  const transporte = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporte.sendMail({ from: `"Jurimetria IA" <${from}>`, to, subject, html });
}

async function enviarCodigoVerificacao(empresa, codigo) {
  const conteudo = `
    <p>Olá, <strong>${empresa.nome_empresa}</strong>.</p>
    <p>Use o código abaixo para confirmar seu e-mail e concluir o cadastro no Sistema de Jurimetria:</p>
    <p style="text-align:center; margin: 28px 0;">
      <span style="display:inline-block; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: ${COR_MARCA}; background: #eef2ff; padding: 14px 24px; border-radius: 8px;">${codigo}</span>
    </p>
    <p>Este código expira em 15 minutos. Se você não solicitou este cadastro, pode ignorar este e-mail.</p>`;
  await enviarEmail({
    to: empresa.email,
    subject: 'Código de verificação — Jurimetria IA',
    html: layoutEmail(conteudo),
  });
}

async function enviarLinkRedefinicaoSenha(empresa, link) {
  const conteudo = `
    <p>Olá, <strong>${empresa.nome_empresa}</strong>.</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
    <p style="text-align:center; margin: 28px 0;">
      <a href="${link}" style="display:inline-block; background:${COR_MARCA}; color:#ffffff; text-decoration:none; font-weight:bold; padding: 12px 28px; border-radius: 8px;">Redefinir senha</a>
    </p>
    <p>Este link expira em 1 hora. Se você não solicitou essa redefinição, ignore este e-mail — sua senha continua a mesma.</p>
    <p style="color:#94a3b8; font-size:12px; word-break: break-all;">Ou copie e cole este endereço no navegador: ${link}</p>`;
  await enviarEmail({
    to: empresa.email,
    subject: 'Redefinição de senha — Jurimetria IA',
    html: layoutEmail(conteudo),
  });
}

module.exports = { enviarCodigoVerificacao, enviarLinkRedefinicaoSenha };
