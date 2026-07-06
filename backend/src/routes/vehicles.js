const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myVehicles, remove } = require('../controllers/vehiclesController');

router.post(
  '/',
  auth,
  [
    body('brand').trim().notEmpty().isLength({ max: 60 }).withMessage('Marca é obrigatória.'),
    body('model').trim().notEmpty().isLength({ max: 60 }).withMessage('Modelo é obrigatório.'),
    body('year').isInt({ min: 1970, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido.'),
  ],
  create
);

router.get('/mine', auth, myVehicles);
router.delete('/:id', auth, remove);

module.exports = router;
