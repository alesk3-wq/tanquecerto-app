const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myVehicles, update, remove } = require('../controllers/vehiclesController');

const vehicleValidators = [
  body('brand').trim().notEmpty().isLength({ max: 60 }).withMessage('Marca é obrigatória.'),
  body('model').trim().notEmpty().isLength({ max: 60 }).withMessage('Modelo é obrigatório.'),
  body('year').isInt({ min: 1970, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido.'),
];

router.post('/', auth, vehicleValidators, create);
router.get('/mine', auth, myVehicles);
router.put('/:id', auth, vehicleValidators, update);
router.delete('/:id', auth, remove);

module.exports = router;
