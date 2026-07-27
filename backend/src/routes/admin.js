const router = require('express').Router();
const auth = require('../middlewares/auth');
const adminOnly = require('../middlewares/adminOnly');
const c = require('../controllers/adminController');

// Painel administrativo — só leitura. `auth` valida o token, `adminOnly`
// confere no banco se é mesmo o e-mail do ADMIN_EMAIL.
router.get('/metrics', auth, adminOnly, c.getMetrics);

module.exports = router;
