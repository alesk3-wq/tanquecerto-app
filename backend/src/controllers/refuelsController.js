const { validationResult } = require('express-validator');
const db = require('../config/db');
const { haversineDistance } = require('../utils/distance');

// Anti-fraude: intervalo mínimo entre dois abastecimentos do mesmo usuário no mesmo posto
const MIN_HOURS_BETWEEN_REFUELS = 3;

// Mesmo raio usado no gate client-side de AddRefuel.jsx
// (frontend/src/constants/map.js) — refaz a mesma conta aqui pra não confiar
// só no que o cliente diz, sem pular a checagem pulando o frontend.
const REFUEL_CHECK_RADIUS_KM = 0.2;

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { station_id, vehicle_id, fuel_type, liters, total_value, km, full_tank, notes, refueled_at, latitude, longitude } = req.body;

    const [[station]] = await db.query('SELECT id, name, latitude, longitude FROM stations WHERE id = ?', [station_id]);
    if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });

    const distance = haversineDistance(latitude, longitude, parseFloat(station.latitude), parseFloat(station.longitude));
    if (distance > REFUEL_CHECK_RADIUS_KM) {
      return res.status(403).json({ error: 'Você precisa estar no posto para registrar o abastecimento.' });
    }

    // Cooldown: não deixa registrar dois abastecimentos no mesmo posto em poucas horas.
    // Ancorado em created_at (horário real do registro), não em refueled_at (data escolhida).
    const [[recent]] = await db.query(
      `SELECT id FROM refuels
       WHERE user_id = ? AND station_id = ?
         AND created_at >= NOW() - INTERVAL ? HOUR
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, station_id, MIN_HOURS_BETWEEN_REFUELS]
    );
    if (recent) {
      return res.status(429).json({
        error: 'Você já registrou um abastecimento neste posto há pouco. Aguarde algumas horas antes de registrar outro.',
      });
    }

    if (vehicle_id) {
      const [[vehicle]] = await db.query(
        'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
        [vehicle_id, req.user.id]
      );
      if (!vehicle) return res.status(400).json({ error: 'Veículo inválido.' });
    }

    const [result] = await db.query(
      `INSERT INTO refuels (user_id, vehicle_id, station_id, fuel_type, liters, total_value, km, full_tank, notes, refueled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, vehicle_id || null, station_id, fuel_type, liters, total_value, km || null, full_tank === false ? 0 : 1, notes || null, refueled_at]
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

    // Filtro opcional por carro (Perfil → aba Abastecimentos) — mesmo efeito
    // nos totais (Total/Litros/Gasto), pra bater com a lista filtrada.
    const vehicleId = parseInt(req.query.vehicle_id);
    const vehicleFilter = Number.isInteger(vehicleId) ? 'AND r.vehicle_id = ?' : '';
    const filterParams = vehicleFilter ? [req.user.id, vehicleId] : [req.user.id];

    const [rows] = await db.query(
      `SELECT r.id, r.fuel_type, r.liters, r.total_value, r.km, r.notes, r.refueled_at,
              ROUND(r.total_value / r.liters, 3) AS price_per_liter,
              s.id AS station_id, s.name AS station_name, s.brand AS station_brand,
              v.brand AS vehicle_brand, v.model AS vehicle_model
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       LEFT JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.user_id = ? ${vehicleFilter}
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM refuels r WHERE r.user_id = ? ${vehicleFilter}`,
      filterParams
    );

    const [[sums]] = await db.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters,
              COALESCE(SUM(total_value), 0) AS total_spent
       FROM refuels r WHERE r.user_id = ? ${vehicleFilter}`,
      filterParams
    );

    res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit), ...sums });
  } catch (err) {
    next(err);
  }
}

async function pendingReview(req, res, next) {
  try {
    // Compara com r.created_at (instante real do registro), não r.refueled_at (só a
    // data escolhida pelo usuário, sem hora) — mesma correção da elegibilidade de
    // avaliação, senão dois ciclos abastecer→avaliar no mesmo dia se atropelam.
    const [[pending]] = await db.query(
      `SELECT r.id, r.station_id, s.name AS station_name, r.fuel_type, r.refueled_at
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       WHERE r.user_id = ?
         AND DATEDIFF(CURDATE(), r.refueled_at) BETWEEN 2 AND 9
         AND NOT EXISTS (
           SELECT 1 FROM reports rep
           WHERE rep.user_id = r.user_id AND rep.station_id = r.station_id
             AND rep.created_at >= r.created_at
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

module.exports = { create, myRefuels, pendingReview, MIN_HOURS_BETWEEN_REFUELS };
