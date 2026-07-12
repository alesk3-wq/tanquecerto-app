const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const c = require('../controllers/stationsController');
const prices = require('../controllers/pricesController');

router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida.'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida.'),
  ],
  c.create
);

router.get('/', c.list);
router.get('/near', c.findNear);
router.get('/:id', optionalAuth, c.getById);
router.get('/:id/stats', c.getStats);
router.get('/:id/problem-tags', c.getProblemTags);
router.get('/:id/reports', optionalAuth, c.getReports);
router.get('/:id/vehicle-stats', c.getVehicleStats);
router.get('/:id/reviewable-refuel', auth, c.getReviewableRefuel);
router.get('/:id/refuel-cooldown', auth, c.getRefuelCooldown);
router.post('/:id/flag', auth, c.toggleFlag);

router.get('/:id/prices', prices.getPrices);
router.post(
  '/:id/prices',
  auth,
  [
    body('fuel_type').isIn(['gasoline', 'ethanol', 'diesel', 'gnv']).withMessage('Tipo de combustível inválido.'),
    body('price').isFloat({ min: 0.01, max: 99.999 }).withMessage('Preço inválido.'),
  ],
  prices.reportPrice
);

module.exports = router;
