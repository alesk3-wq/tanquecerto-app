// Tokens de uso único (recuperação de senha, confirmação de e-mail) — token
// opaco em vez de JWT de propósito: precisa ser revogável antes da expiração
// natural (pedir um link novo mata o anterior), e JWT não revoga sem uma
// lista de bloqueio à parte — que seria só reinventar esta mesma tabela.
const crypto = require('crypto');
const db = require('../config/db');

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Só um token pendente por vez, por usuário+tipo — pedir de novo invalida
// o anterior (evita dois links vivos ao mesmo tempo).
async function invalidateOutstanding(userId, type) {
  await db.query(
    `UPDATE auth_tokens SET used_at = NOW() WHERE user_id = ? AND type = ? AND used_at IS NULL`,
    [userId, type]
  );
}

async function createToken(userId, type, ttlMs) {
  await invalidateOutstanding(userId, type);
  const raw = generateRawToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.query(
    'INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, ?)',
    [userId, hashToken(raw), type, expiresAt]
  );
  return raw; // só existe aqui e no link do e-mail — nunca persistido em texto puro
}

async function consumeToken(rawToken, type) {
  const [rows] = await db.query(
    `SELECT * FROM auth_tokens
     WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(rawToken), type]
  );
  if (!rows.length) return null;
  await db.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [rows[0].id]);
  return rows[0];
}

// Busca sem exigir used_at IS NULL — usado só pra checar se um token já
// consumido pertence mesmo a este link (duplo clique em confirmação de
// e-mail, ver confirmEmail em authController.js), nunca pra autorizar de
// novo uma ação sensível como reset de senha.
async function findByHash(rawToken, type) {
  const [rows] = await db.query(
    'SELECT * FROM auth_tokens WHERE token_hash = ? AND type = ?',
    [hashToken(rawToken), type]
  );
  return rows[0] ?? null;
}

module.exports = { createToken, consumeToken, invalidateOutstanding, findByHash };
