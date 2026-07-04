const db = require('../config/db');
const { validationResult } = require('express-validator');

const FUEL_LABELS = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };

async function getPrices(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT fuel_type, price, updated_at
       FROM fuel_prices
       WHERE station_id = ?
       ORDER BY FIELD(fuel_type, 'gasoline', 'ethanol', 'diesel', 'gnv')`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function reportPrice(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fuel_type, price } = req.body;
    const stationId = req.params.id;

    const [[station]] = await db.query('SELECT id FROM stations WHERE id = ?', [stationId]);
    if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });

    await db.query(
      `INSERT INTO fuel_prices (station_id, user_id, fuel_type, price)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE price = VALUES(price), user_id = VALUES(user_id), updated_at = NOW()`,
      [stationId, req.user.id, fuel_type, price]
    );

    res.json({ fuel_type, label: FUEL_LABELS[fuel_type], price: parseFloat(price) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPrices, reportPrice };
