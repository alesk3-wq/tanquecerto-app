const { validationResult } = require('express-validator');
const db = require('../config/db');

// Vocabulário fechado de sintomas de combustível — espelha
// frontend/src/constants/reportTags.js. Substitui o antigo campo de texto
// livre (removido por risco de acusação infundada); só faz sentido quando a
// avaliação geral for suspect/bad.
const VALID_TAGS = new Set([
  'engasgo', 'cheiro_cor', 'consumo_pior', 'luz_acesa',
  'bomba_suspeita', 'motor_irregular', 'preco_divergente',
]);

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { station_id, type, description, tags } = req.body;

    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [station_id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    // Só pode avaliar quem abasteceu no posto e ainda não avaliou aquele abastecimento:
    // precisa existir um refuel sem nenhuma avaliação criada depois dele (mesma condição
    // do lembrete de avaliação pendente). Compara com r.created_at (instante real do
    // registro), não r.refueled_at (só a data escolhida pelo usuário, sem hora) — senão
    // dois ciclos abastecer→avaliar no mesmo dia se atropelam. O combustível da avaliação
    // é o do abastecimento elegível mais recente — definido aqui, não pelo cliente.
    const [[eligible]] = await db.query(
      `SELECT r.fuel_type FROM refuels r
       WHERE r.user_id = ? AND r.station_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM reports rep
           WHERE rep.user_id = r.user_id AND rep.station_id = r.station_id
             AND rep.created_at >= r.created_at
         )
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT 1`,
      [req.user.id, station_id]
    );
    if (!eligible) {
      return res.status(403).json({ error: 'Você precisa registrar um abastecimento neste posto antes de avaliá-lo.' });
    }
    const fuel_type = eligible.fuel_type;

    // 1 relato por usuário por dia por posto
    const [existing] = await db.query(
      `SELECT id FROM reports
       WHERE user_id = ? AND station_id = ? AND DATE(created_at) = CURDATE()`,
      [req.user.id, station_id]
    );
    if (existing.length) {
      return res.status(429).json({ error: 'Você já avaliou este posto hoje.' });
    }

    const [result] = await db.query(
      'INSERT INTO reports (user_id, station_id, type, fuel_type, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, station_id, type, fuel_type, description || null]
    );

    // Sintomas só fazem sentido numa avaliação suspect/bad — em qualquer outro
    // caso são ignorados silenciosamente, sem erro (mesmo espírito permissivo
    // do resto do form).
    let validTags = [];
    if ((type === 'suspect' || type === 'bad') && Array.isArray(tags)) {
      validTags = [...new Set(tags)].filter((t) => VALID_TAGS.has(t));
      if (validTags.length) {
        await db.query(
          'INSERT INTO report_tags (report_id, tag) VALUES ?',
          [validTags.map((tag) => [result.insertId, tag])]
        );
      }
    }

    res.status(201).json({ id: result.insertId, station_id, type, fuel_type, description, tags: validTags });
  } catch (err) {
    next(err);
  }
}

async function myReports(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT r.id, r.station_id, r.type, r.fuel_type, r.description, r.created_at,
              s.name AS station_name, s.brand AS station_brand
       FROM reports r
       JOIN stations s ON r.station_id = s.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM reports WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function toggleVote(req, res, next) {
  try {
    const reportId = req.params.id;
    const userId   = req.user.id;

    const [[exists]] = await db.query(
      'SELECT id FROM report_votes WHERE user_id = ? AND report_id = ?',
      [userId, reportId]
    );

    if (exists) {
      await db.query('DELETE FROM report_votes WHERE user_id = ? AND report_id = ?', [userId, reportId]);
      return res.json({ voted: false });
    }

    const [[report]] = await db.query('SELECT id FROM reports WHERE id = ?', [reportId]);
    if (!report) return res.status(404).json({ error: 'Relato não encontrado.' });

    await db.query('INSERT INTO report_votes (user_id, report_id) VALUES (?, ?)', [userId, reportId]);
    res.json({ voted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, myReports, toggleVote };
