const db = require('../config/db');
const { isAdmin } = require('../services/adminService');

// Portão do painel administrativo. Usar sempre DEPOIS do middleware `auth`
// (que já validou o JWT e preencheu req.user).
//
// Duas decisões que valem a explicação:
//
// 1. Confere o e-mail no BANCO, não o do token. O JWT carrega `email`, mas
//    fica congelado por 7 dias (JWT_EXPIRES_IN) — se o e-mail do admin mudar,
//    um token antigo continuaria passando. A consulta é por chave primária e
//    só roda nas rotas do painel, então o custo é irrelevante.
//
// 2. Responde 403, nunca 401. O interceptor do axios no frontend
//    (frontend/src/api/api.js) desloga o usuário em qualquer 401 — um usuário
//    comum que tentasse a URL do painel seria expulso do app inteiro sem
//    entender o motivo. 403 diz "você está logado, mas não pode isso".
async function adminOnly(req, res, next) {
  try {
    const [[user]] = await db.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ error: 'Acesso restrito.' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = adminOnly;
