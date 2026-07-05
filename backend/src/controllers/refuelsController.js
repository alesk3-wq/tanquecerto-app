const { validationResult } = require('express-validator');
const db = require('../config/db');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { station_id, fuel_type, liters, total_value, km, notes, refueled_at } = req.body;

    const [[station]] = await db.query('SELECT id, name FROM stations WHERE id = ?', [station_id]);
    if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });

    const [result] = await db.query(
      `INSERT INTO refuels (user_id, station_id, fuel_type, liters, total_value, km, notes, refueled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, station_id, fuel_type, liters, total_value, km || null, notes || null, refueled_at]
    );

    res.status(201).json({ id: result.insertId, station_name: station.name, fuel_type, liters, total_value, refueled_at });
  } catch (err) {
    next(err);
  }
}

async function myRefuels(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT r.id, r.fuel_type, r.liters, r.total_value, r.km, r.notes, r.refueled_at,
              ROUND(r.total_value / r.liters, 3) AS price_per_liter,
              s.id AS station_id, s.name AS station_name, s.brand AS station_brand
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       WHERE r.user_id = ?
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM refuels WHERE user_id = ?',
      [req.user.id]
    );

    const [[sums]] = await db.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters,
              COALESCE(SUM(total_value), 0) AS total_spent
       FROM refuels WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit), ...sums });
  } catch (err) {
    next(err);
  }
}

async function pendingReview(req, res, next) {
  try {
    const [[pending]] = await db.query(
      `SELECT r.id, r.station_id, s.name AS station_name, r.fuel_type, r.refueled_at
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       WHERE r.user_id = ?
         AND DATEDIFF(CURDATE(), r.refueled_at) BETWEEN 2 AND 9
         AND NOT EXISTS (
           SELECT 1 FROM reports rep
           WHERE rep.user_id = r.user_id AND rep.station_id = r.station_id
             AND rep.created_at >= r.refueled_at
         )
       ORDER BY r.refueled_at ASC
       LIMIT 1`,
      [req.user.id]
    );
    res.json(pending ?? null);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, myRefuels, pendingReview };
