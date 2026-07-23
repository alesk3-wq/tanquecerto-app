const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resendConfirmationLimiter } = require('../middlewares/authRateLimit');
const { register, login, me, forgotPassword, resetPassword, confirmEmail, resendConfirmation } = require('../controllers/authController');
const { isValidCPF } = require('../utils/cpf');

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres.'),
    body('cpf')
      .customSanitizer((v) => (v || '').replace(/\D/g, ''))
      .notEmpty().withMessage('CPF é obrigatório.')
      .bail()
      .custom((v) => isValidCPF(v)).withMessage('CPF inválido.'),
  ],
  register
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Senha é obrigatória.'),
  ],
  login
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail()],
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token é obrigatório.'),
    body('password').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres.'),
  ],
  resetPassword
);

router.post(
  '/confirm-email',
  [body('token').notEmpty().withMessage('Token é obrigatório.')],
  confirmEmail
);

router.post(
  '/resend-confirmation',
  resendConfirmationLimiter,
  [body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail()],
  resendConfirmation
);

router.get('/me', auth, me);

module.exports = router;
