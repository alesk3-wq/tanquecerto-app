const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resendConfirmationLimiter, changePasswordLimiter } = require('../middlewares/authRateLimit');
const { register, login, me, updateMe, changePassword, deleteAccount, forgotPassword, resetPassword, confirmEmail, resendConfirmation } = require('../controllers/authController');

// Telefone opcional; se vier, 10 ou 11 dígitos (DDD + número) depois de
// tirar máscara/espaços.
const phoneRule = body('phone')
  .optional({ values: 'falsy' })
  .custom((v) => /^\d{10,11}$/.test(String(v).replace(/\D/g, '')))
  .withMessage('Telefone inválido. Use DDD + número, ex: (11) 99999-9999.');

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres.'),
    phoneRule,
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

router.put(
  '/me',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório.')
      .isLength({ max: 100 }).withMessage('Nome muito longo.'),
    phoneRule,
  ],
  updateMe
);

router.put(
  '/me/password',
  auth,
  changePasswordLimiter,
  [
    body('current_password').notEmpty().withMessage('Informe a senha atual.'),
    body('new_password').isLength({ min: 6 }).withMessage('A nova senha precisa ter no mínimo 6 caracteres.'),
  ],
  changePassword
);

router.delete(
  '/me',
  auth,
  [body('password').notEmpty().withMessage('Confirme a senha para excluir a conta.')],
  deleteAccount
);

module.exports = router;
