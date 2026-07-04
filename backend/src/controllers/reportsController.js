const { validationResult } = require('express-validator');
const db = require('../config/db');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { station_id, type, fuel_type, description } = req.body;

    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [station_id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

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
      [req.user.id, station_id, type, fuel_type || 'gasoline', description || null]
    );

    res.status(201).json({ id: result.insertId, station_id, type, fuel_type, description });
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
