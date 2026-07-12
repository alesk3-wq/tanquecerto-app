const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myRefuels, pendingReview } = require('../controllers/refuelsController');

router.post(
  '/',
  auth,
  [
    body('station_id').isInt({ min: 1 }),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida.'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida.'),
    body('fuel_type').isIn(['gasoline', 'ethanol', 'diesel', 'gnv']),
    body('liters').isFloat({ min: 0.1 }),
    body('total_value').isFloat({ min: 0.01 }),
    body('refueled_at').isDate(),
    body('vehicle_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('km').custom((value, { req }) => {
      if (req.body.vehicle_id && (value === undefined || value === null || value === '')) {
        throw new Error('KM é obrigatório quando um veículo é selecionado.');
      }
      return true;
    }),
    body('km').optional({ nullable: true }).isInt({ min: 0 }),
    body('full_tank').optional().isBoolean().toBoolean(),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  create
);

router.get('/mine', auth, myRefuels);
router.get('/pending-review', auth, pendingReview);

module.exports = router;
