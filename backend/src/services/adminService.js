// Única fonte da regra "quem é admin". Usada pelo middleware que protege o
// painel (adminOnly.js) e pelo /auth/me + login, que informam `is_admin` pro
// frontend decidir se mostra o link do painel.
//
// Sem ADMIN_EMAIL configurado, ninguém é admin — padrão seguro: melhor o
// painel não abrir do que abrir pra qualquer um.
function isAdmin(email) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}

module.exports = { isAdmin };
