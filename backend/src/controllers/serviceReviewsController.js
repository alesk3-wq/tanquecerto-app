const { validationResult } = require('express-validator');
const db = require('../config/db');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { station_id, sentiment, comment } = req.body;

    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [station_id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    // Só pode avaliar o atendimento quem abasteceu no posto e ainda não
    // avaliou aquele abastecimento — trilha independente de combustível
    // (reports), mesmo padrão de elegibilidade (NOT EXISTS avaliação criada
    // depois do abastecimento). Um mesmo abastecimento pode ter avaliação de
    // combustível pendente, de atendimento pendente, as duas ou nenhuma.
    const [[eligible]] = await db.query(
      `SELECT r.id FROM refuels r
       WHERE r.user_id = ? AND r.station_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM service_reviews sr
           WHERE sr.user_id = r.user_id AND sr.station_id = r.station_id
             AND sr.created_at >= r.created_at
         )
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT 1`,
      [req.user.id, station_id]
    );
    if (!eligible) {
      return res.status(403).json({ error: 'Você precisa registrar um abastecimento neste posto antes de avaliar o atendimento.' });
    }

    const [result] = await db.query(
      'INSERT INTO service_reviews (user_id, station_id, sentiment, comment) VALUES (?, ?, ?, ?)',
      [req.user.id, station_id, sentiment, comment || null]
    );

    res.status(201).json({ id: result.insertId, station_id, sentiment, comment: comment || null });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
