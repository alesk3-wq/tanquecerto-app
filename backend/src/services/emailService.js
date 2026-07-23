// Envio de e-mail transacional via Resend (API HTTP simples, fetch nativo —
// sem dependência nova, mesmo padrão do script de importação da ANP). Toda
// integração específica do provedor fica só neste arquivo — trocar de
// provedor no futuro é mudar um arquivo só.
const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
  // Sem chave configurada (antes de criar conta no Resend, ou em teste) —
  // loga em vez de falhar, não trava o cadastro/fluxo. É também o mecanismo
  // usado pra testar sem checar caixa de entrada de verdade.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[emailService] RESEND_API_KEY ausente — e-mail não enviado.\nPara: ${to}\nAssunto: ${subject}\n${html}`);
    return { skipped: true };
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend API respondeu ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

async function sendConfirmationEmail(to, confirmUrl) {
  return sendEmail({
    to,
    subject: 'Confirme seu e-mail — TanqueCerto',
    html: `
      <p>Falta pouco! Confirme seu e-mail pra ativar sua conta no TanqueCerto:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>Se você não criou uma conta, pode ignorar este e-mail.</p>
    `,
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  return sendEmail({
    to,
    subject: 'Recuperação de senha — TanqueCerto',
    html: `
      <p>Recebemos um pedido pra redefinir sua senha. Clique no link abaixo (válido por 1 hora):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
    `,
  });
}

module.exports = { sendConfirmationEmail, sendPasswordResetEmail };
