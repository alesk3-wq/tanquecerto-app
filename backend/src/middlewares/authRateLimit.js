const rateLimit = require('express-rate-limit');

function handler(message) {
  return (req, res) => res.status(429).json({ error: message });
}

// Força bruta de senha: janela curta, poucas tentativas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Muitas tentativas de login. Tente novamente em alguns minutos.'),
});

// Spam/criação em massa de contas: janela mais longa, limite mais apertado.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Muitas tentativas de cadastro. Tente novamente mais tarde.'),
});

// Spam de e-mail pra terceiro ou enumeração de conta: mesmo perfil do
// registerLimiter, o risco aqui é mais parecido com abuso em massa do que
// com usuário real errando a senha.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Muitas solicitações. Tente novamente mais tarde.'),
});

const resendConfirmationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Muitas solicitações. Tente novamente mais tarde.'),
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter, resendConfirmationLimiter };
