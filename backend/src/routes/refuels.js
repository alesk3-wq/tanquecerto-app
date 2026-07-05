const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myRefuels, pendingReview } = require('../controllers/refuelsController');

router.post(
  '/',
  auth,
  [
    body('station_id').isInt({ min: 1 }),
    body('fuel_type').isIn(['gasoline', 'ethanol', 'diesel', 'gnv']),
    body('liters').isFloat({ min: 0.1 }),
    body('total_value').isFloat({ min: 0.01 }),
    body('refueled_at').isDate(),
    body('km').optional({ nullable: true }).isInt({ min: 0 }),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  create
);

router.get('/mine', auth, myRefuels);
router.get('/pending-review', auth, pendingReview);

module.exports = router;
