const { validationResult } = require('express-validator');
const db = require('../config/db');
const { haversineDistance } = require('../utils/distance');
const { buildStats } = require('../services/reputationService');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, brand, address, latitude, longitude } = req.body;
    const [result] = await db.query(
      'INSERT INTO stations (name, brand, address, latitude, longitude, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, brand || null, address || null, latitude, longitude, req.user.id]
    );

    res.status(201).json({ id: result.insertId, name, brand, address, latitude, longitude });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT id, name, brand, address, latitude, longitude, created_at FROM stations ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM stations');

    res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function findNear(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Parâmetros lat e lng são obrigatórios.' });
    }

    const [stations] = await db.query(
      'SELECT id, name, brand, address, latitude, longitude FROM stations'
    );

    const nearby = [];
    for (const s of stations) {
      const dist = haversineDistance(lat, lng, parseFloat(s.latitude), parseFloat(s.longitude));
      if (dist <= radius) {
        const [reports] = await db.query(
          'SELECT type FROM reports WHERE station_id = ? ORDER BY created_at DESC',
          [s.id]
        );
        const { reputation, score } = buildStats(reports);
        nearby.push({ ...s, distance: Math.round(dist * 10) / 10, reputation, score });
      }
    }

    nearby.sort((a, b) => a.distance - b.distance);
    res.json(nearby);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT id, name, brand, address, latitude, longitude, created_at FROM stations WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Posto não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const [reports] = await db.query(
      'SELECT type, created_at FROM reports WHERE station_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json(buildStats(reports));
  } catch (err) {
    next(err);
  }
}

async function getReports(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const userId = req.user?.id ?? null;
    const params = [];

    let userVotedExpr = '0 AS user_voted';
    if (userId) {
      userVotedExpr = 'EXISTS(SELECT 1 FROM report_votes rv2 WHERE rv2.report_id = r.id AND rv2.user_id = ?) AS user_voted';
      params.push(userId);
    }
    params.push(req.params.id, limit, offset);

    const [rows] = await db.query(
      `SELECT r.id, r.type, r.fuel_type, r.description, r.created_at,
              COUNT(rv.id) AS vote_count,
              ${userVotedExpr}
       FROM reports r
       LEFT JOIN report_votes rv ON rv.report_id = r.id
       WHERE r.station_id = ?
       GROUP BY r.id, r.type, r.fuel_type, r.description, r.created_at
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM reports WHERE station_id = ?',
      [req.params.id]
    );

    res.json({
      data: rows.map((r) => ({ ...r, user_voted: !!r.user_voted })),
      page, limit, total, pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

async function getVehicleStats(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const [rows] = await db.query(
      `WITH ordered AS (
         SELECT r.station_id, r.fuel_type, r.vehicle_id, r.km, r.liters,
                LEAD(r.km) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_km,
                LEAD(r.liters) OVER (PARTITION BY r.vehicle_id ORDER BY r.refueled_at, r.created_at) AS next_liters
         FROM refuels r
         WHERE r.vehicle_id IS NOT NULL AND r.km IS NOT NULL
       ),
       measurements AS (
         SELECT station_id, fuel_type, vehicle_id, (next_km - km) / next_liters AS consumption
         FROM ordered
         WHERE next_km IS NOT NULL AND next_liters IS NOT NULL AND next_km > km
       )
       SELECT v.brand, v.model, v.year, m.fuel_type,
              ROUND(AVG(m.consumption), 1) AS avg_consumption, COUNT(*) AS samples
       FROM measurements m
       JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.station_id = ? AND m.consumption BETWEEN 1 AND 40
       GROUP BY v.brand, v.model, v.year, m.fuel_type
       HAVING COUNT(*) >= 3
       ORDER BY v.brand, v.model, v.year`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, findNear, getById, getStats, getReports, getVehicleStats };
