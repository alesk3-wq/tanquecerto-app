const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const { create } = require('../controllers/serviceReviewsController');

router.post(
  '/',
  auth,
  [
    body('station_id').isInt({ min: 1 }),
    body('sentiment').isIn(['good', 'neutral', 'bad']).withMessage('Sentimento inválido.'),
    body('comment').optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  create
);

module.exports = router;
