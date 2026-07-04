const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { register, login, me } = require('../controllers/authController');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres.'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Senha é obrigatória.'),
  ],
  login
);

router.get('/me', auth, me);

module.exports = router;
