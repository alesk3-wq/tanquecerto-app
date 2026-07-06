const db = require('../config/db');
const { validationResult } = require('express-validator');

const FUEL_LABELS = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };

const FUEL_ORDER = ['gasoline', 'ethanol', 'diesel', 'gnv'];

async function getPrices(req, res, next) {
  try {
    const [manual] = await db.query(
      'SELECT fuel_type, price, updated_at FROM fuel_prices WHERE station_id = ?',
      [req.params.id]
    );
    const [computed] = await db.query(
      `SELECT fuel_type, ROUND(AVG(total_value / liters), 3) AS avg_price, COUNT(*) AS avg_samples
       FROM refuels
       WHERE station_id = ? AND refueled_at >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
       GROUP BY fuel_type`,
      [req.params.id]
    );

    const byFuel = {};
    for (const row of manual) {
      byFuel[row.fuel_type] = { fuel_type: row.fuel_type, price: row.price, updated_at: row.updated_at };
    }
    for (const row of computed) {
      byFuel[row.fuel_type] = {
        ...(byFuel[row.fuel_type] ?? { fuel_type: row.fuel_type, price: null, updated_at: null }),
        avg_price: row.avg_price,
        avg_samples: row.avg_samples,
      };
    }

    const rows = Object.values(byFuel).sort(
      (a, b) => FUEL_ORDER.indexOf(a.fuel_type) - FUEL_ORDER.indexOf(b.fuel_type)
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
