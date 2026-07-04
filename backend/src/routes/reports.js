const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create, myReports, toggleVote } = require('../controllers/reportsController');

router.post(
  '/',
  auth,
  [
    body('station_id').isInt({ min: 1 }).withMessage('station_id inválido.'),
    body('type').isIn(['good', 'suspect', 'bad']).withMessage('Tipo deve ser good, suspect ou bad.'),
    body('fuel_type')
      .optional()
      .isIn(['gasoline', 'ethanol', 'diesel', 'gnv'])
      .withMessage('Tipo de combustível inválido.'),
    body('description').optional().isString().isLength({ max: 500 }),
  ],
  create
);

router.get('/mine', auth, myReports);
router.post('/:id/vote', auth, toggleVote);

module.exports = router;
