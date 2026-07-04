const db = require('../config/db');

function calcReputation(good, suspect, bad) {
  const total = good + suspect + bad;
  const score = good * 2 - suspect * 1 - bad * 2;
  if (total < 3) return { reputation: 'unknown', score };
  if (score >= 5) return { reputation: 'good', score };
  if (score >= 1) return { reputation: 'suspect', score };
  return { reputation: 'bad', score };
}

async function toggle(req, res, next) {
  try {
    const stationId = parseInt(req.params.station_id);
    const userId = req.user.id;

    const [[exists]] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND station_id = ?',
      [userId, stationId]
    );

    if (exists) {
      await db.query('DELETE FROM favorites WHERE user_id = ? AND station_id = ?', [userId, stationId]);
      return res.json({ favorited: false });
    }

    const [[station]] = await db.query('SELECT id FROM stations WHERE id = ?', [stationId]);
    if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });

    await db.query('INSERT INTO favorites (user_id, station_id) VALUES (?, ?)', [userId, stationId]);
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
}

async function check(req, res, next) {
  try {
    const [[row]] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND station_id = ?',
      [req.user.id, req.params.station_id]
    );
    res.json({ favorited: !!row });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT
         s.id, s.name, s.brand, s.address,
         f.created_at AS favorited_at,
         COALESCE(SUM(CASE WHEN r.type = 'good'    THEN 1 ELSE 0 END), 0) AS good_count,
         COALESCE(SUM(CASE WHEN r.type = 'suspect' THEN 1 ELSE 0 END), 0) AS suspect_count,
         COALESCE(SUM(CASE WHEN r.type = 'bad'     THEN 1 ELSE 0 END), 0) AS bad_count
       FROM favorites f
       JOIN stations s ON s.id = f.station_id
       LEFT JOIN reports r ON r.station_id = s.id
       WHERE f.user_id = ?
       GROUP BY s.id, s.name, s.brand, s.address, f.created_at
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    const result = rows.map((s) => {
      const { reputation, score } = calcReputation(s.good_count, s.suspect_count, s.bad_count);
      return { id: s.id, name: s.name, brand: s.brand, address: s.address, reputation, score, favorited_at: s.favorited_at };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { toggle, check, list };
