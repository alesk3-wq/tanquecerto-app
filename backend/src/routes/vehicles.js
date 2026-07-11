const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myVehicles, update, remove, setDefault } = require('../controllers/vehiclesController');

const vehicleValidators = [
  body('brand').trim().notEmpty().isLength({ max: 60 }).withMessage('Marca é obrigatória.'),
  body('model').trim().notEmpty().isLength({ max: 60 }).withMessage('Modelo é obrigatório.'),
  body('year').isInt({ min: 1970, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido.'),
  body('default_fuel_type').optional({ nullable: true, checkFalsy: true })
    .isIn(['gasoline', 'ethanol', 'diesel', 'gnv']).withMessage('Combustível inválido.'),
];

router.post('/', auth, vehicleValidators, create);
router.get('/mine', auth, myVehicles);
router.put('/:id', auth, vehicleValidators, update);
router.put('/:id/default', auth, setDefault);
router.delete('/:id', auth, remove);

module.exports = router;
