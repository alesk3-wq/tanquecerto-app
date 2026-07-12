const { validationResult } = require('express-validator');
const db = require('../config/db');
const { MEASUREMENTS_CTE, MIN_MEASUREMENTS } = require('../services/consumptionService');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { brand, model, year, default_fuel_type } = req.body;

    // Primeiro carro do usuário já nasce padrão — sem isso ninguém teria
    // padrão até clicar manualmente, e o abastecimento perderia a pré-seleção.
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM vehicles WHERE user_id = ?',
      [req.user.id]
    );
    const isDefault = count === 0;

    const [result] = await db.query(
      'INSERT INTO vehicles (user_id, brand, model, year, is_default, default_fuel_type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, brand, model, year, isDefault, default_fuel_type || null]
    );

    res.status(201).json({
      id: result.insertId, brand, model, year,
      is_default: isDefault, default_fuel_type: default_fuel_type || null,
    });
  } catch (err) {
    next(err);
  }
}

async function myVehicles(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT v.id, v.brand, v.model, v.year, v.is_default, v.default_fuel_type,
              (SELECT r.km FROM refuels r
               WHERE r.vehicle_id = v.id AND r.km IS NOT NULL
               ORDER BY r.refueled_at DESC, r.created_at DESC LIMIT 1) AS last_km
       FROM vehicles v
       WHERE v.user_id = ?
       ORDER BY v.is_default DESC, v.created_at DESC, v.id DESC`,
      [req.user.id]
    );

    // Consumo médio pessoal por veículo — soma medidas de TODOS os postos
    // onde o carro abasteceu (não só um), histórico do próprio dono, sem
    // exigir usuários diferentes (ver consumptionService.js).
    const consumptionByVehicle = {};
    if (rows.length) {
      const ids = rows.map((v) => v.id);
      const [measurements] = await db.query(
        MEASUREMENTS_CTE +
        `SELECT m.vehicle_id, m.fuel_type,
                ROUND(AVG(m.consumption), 1) AS avg_consumption, COUNT(*) AS samples
         FROM measurements m
         WHERE m.vehicle_id IN (?) AND m.consumption BETWEEN 1 AND 40
         GROUP BY m.vehicle_id, m.fuel_type
         HAVING COUNT(*) >= ?`,
        [ids, MIN_MEASUREMENTS]
      );
      for (const m of measurements) {
        (consumptionByVehicle[m.vehicle_id] ??= []).push({
          fuel_type: m.fuel_type, avg_consumption: m.avg_consumption, samples: m.samples,
        });
      }
    }

    res.json(rows.map((v) => ({
      ...v, is_default: !!v.is_default, consumption: consumptionByVehicle[v.id] ?? [],
    })));
  } catch (err) {
    next(err);
  }
}

// Marca este carro como padrão e desmarca os demais do usuário — só um
// padrão por vez, mesmo padrão simples de toggle usado no resto do app
// (sem transação, consistente com o estilo já existente no controller).
async function setDefault(req, res, next) {
  try {
    const [result] = await db.query(
      'UPDATE vehicles SET is_default = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Veículo não encontrado.' });

    await db.query(
      'UPDATE vehicles SET is_default = 0 WHERE user_id = ? AND id != ?',
      [req.user.id, req.params.id]
    );

    res.json({ id: parseInt(req.params.id), is_default: true });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { brand, model, year, default_fuel_type } = req.body;
    const [result] = await db.query(
      'UPDATE vehicles SET brand = ?, model = ?, year = ?, default_fuel_type = ? WHERE id = ? AND user_id = ?',
      [brand, model, year, default_fuel_type || null, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Veículo não encontrado.' });
    res.json({ id: parseInt(req.params.id), brand, model, year, default_fuel_type: default_fuel_type || null });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const [result] = await db.query(
      'DELETE FROM vehicles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Veículo não encontrado.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, myVehicles, update, remove, setDefault };
