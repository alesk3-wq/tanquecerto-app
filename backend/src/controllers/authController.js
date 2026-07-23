const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const { createToken, consumeToken, findByHash } = require('../services/tokenService');
const { sendConfirmationEmail, sendPasswordResetEmail } = require('../services/emailService');

const EMAIL_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, phone, cpf } = req.body;

    const [existing] = await db.query('SELECT id, email, cpf FROM users WHERE email = ? OR cpf = ?', [email, cpf]);
    if (existing.length) {
      const conflict = existing[0].email === email ? 'E-mail já cadastrado.' : 'CPF já cadastrado.';
      return res.status(409).json({ error: conflict });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, cpf) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, phone || null, cpf]
    );

    // Cadastro NÃO loga automaticamente — login fica bloqueado até confirmar
    // o e-mail (ver login()), então devolver um token aqui já furaria essa
    // trava. Falha no envio do e-mail não desfaz a conta (o usuário ainda
    // pode pedir reenvio depois) — só loga o erro.
    try {
      const rawToken = await createToken(result.insertId, 'email_confirmation', EMAIL_CONFIRMATION_TTL_MS);
      const confirmUrl = `${process.env.APP_BASE_URL}/confirm-email/${rawToken}`;
      await sendConfirmationEmail(email, confirmUrl);
    } catch (emailErr) {
      console.error('Falha ao enviar e-mail de confirmação:', emailErr.message);
    }

    res.status(201).json({ message: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas.' });

    if (!user.email_verified_at) {
      return res.status(403).json({ error: 'Confirme seu e-mail antes de entrar.', unverified: true });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Sempre responde a mesma mensagem genérica, exista ou não o e-mail —
// evita que alguém descubra quais e-mails estão cadastrados tentando um por um.
async function forgotPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const [[user]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (user) {
      try {
        const rawToken = await createToken(user.id, 'password_reset', PASSWORD_RESET_TTL_MS);
        const resetUrl = `${process.env.APP_BASE_URL}/reset-password/${rawToken}`;
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailErr) {
        console.error('Falha ao enviar e-mail de recuperação:', emailErr.message);
      }
    }

    res.json({ message: 'Se este e-mail estiver cadastrado, você receberá um e-mail com instruções em instantes.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;
    const consumed = await consumeToken(token, 'password_reset');
    if (!consumed) return res.status(400).json({ error: 'Link inválido ou expirado.' });

    const hash = await bcrypt.hash(password, 12);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, consumed.user_id]);

    res.json({ message: 'Senha alterada com sucesso. Faça login.' });
  } catch (err) {
    next(err);
  }
}

// Idempotente: clicar duas vezes no link não dá erro.
async function confirmEmail(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token } = req.body;
    const consumed = await consumeToken(token, 'email_confirmation');
    if (consumed) {
      await db.query(
        'UPDATE users SET email_verified_at = NOW() WHERE id = ? AND email_verified_at IS NULL',
        [consumed.user_id]
      );
      return res.json({ message: 'E-mail confirmado! Você já pode entrar.' });
    }

    // Token já consumido antes (duplo clique no mesmo link) — se já confirmou
    // o e-mail daquela vez, trata como sucesso idempotente em vez de erro.
    // Diferente de reset de senha, confirmar de novo não tem efeito colateral
    // sensível, então não precisa ficar restrito a uso único de verdade.
    const existing = await findByHash(token, 'email_confirmation');
    if (existing?.used_at) {
      const [[user]] = await db.query('SELECT email_verified_at FROM users WHERE id = ?', [existing.user_id]);
      if (user?.email_verified_at) {
        return res.json({ message: 'E-mail confirmado! Você já pode entrar.' });
      }
    }

    res.status(400).json({ error: 'Link inválido ou expirado.' });
  } catch (err) {
    next(err);
  }
}

// Mesma resposta genérica de forgotPassword, mesmo motivo (não expor se o
// e-mail existe ou já foi confirmado).
async function resendConfirmation(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const [[user]] = await db.query('SELECT id, email_verified_at FROM users WHERE email = ?', [email]);

    if (user && !user.email_verified_at) {
      try {
        const rawToken = await createToken(user.id, 'email_confirmation', EMAIL_CONFIRMATION_TTL_MS);
        const confirmUrl = `${process.env.APP_BASE_URL}/confirm-email/${rawToken}`;
        await sendConfirmationEmail(email, confirmUrl);
      } catch (emailErr) {
        console.error('Falha ao reenviar e-mail de confirmação:', emailErr.message);
      }
    }

    res.json({ message: 'Se este e-mail estiver cadastrado e pendente de confirmação, reenviamos o link.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword, confirmEmail, resendConfirmation };
