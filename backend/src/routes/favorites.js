const router = require('express').Router();
const auth = require('../middlewares/auth');
const c = require('../controllers/favoritesController');

router.get('/',                auth, c.list);
router.get('/:station_id',     auth, c.check);
router.post('/:station_id',    auth, c.toggle);

module.exports = router;
