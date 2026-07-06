const { validationResult } = require('express-validator');
const db = require('../config/db');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { brand, model, year } = req.body;
    const [result] = await db.query(
      'INSERT INTO vehicles (user_id, brand, model, year) VALUES (?, ?, ?, ?)',
      [req.user.id, brand, model, year]
    );

    res.status(201).json({ id: result.insertId, brand, model, year });
  } catch (err) {
    next(err);
  }
}

async function myVehicles(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT id, brand, model, year FROM vehicles WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { brand, model, year } = req.body;
    const [result] = await db.query(
      'UPDATE vehicles SET brand = ?, model = ?, year = ? WHERE id = ? AND user_id = ?',
      [brand, model, year, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Veículo não encontrado.' });
    res.json({ id: parseInt(req.params.id), brand, model, year });
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

module.exports = { create, myVehicles, update, remove };
