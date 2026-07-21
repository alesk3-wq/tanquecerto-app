const { validationResult } = require('express-validator');
const db = require('../config/db');
const { haversineDistance, boundingBox } = require('../utils/distance');
const { buildStats } = require('../services/reputationService');
const { computeStationStatus, daysSince, MIN_STATION_FLAGS } = require('../services/stationStatusService');
const { MIN_HOURS_BETWEEN_REFUELS } = require('./refuelsController');
const { MEASUREMENTS_CTE, MIN_DISTINCT_USERS } = require('../services/consumptionService');

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

    // Postos sinalizados (quórum de "não existe") ficam de fora da listagem por
    // padrão — ver stationStatusService. Nunca são apagados, só somem da busca.
    const [rows] = await db.query(
      `SELECT s.id, s.name, s.brand, s.address, s.latitude, s.longitude, s.created_at,
              EXISTS(SELECT 1 FROM refuels r WHERE r.station_id = s.id) AS has_refuel,
              (SELECT COUNT(*) FROM station_flags f WHERE f.station_id = s.id) AS flag_count
       FROM stations s
       HAVING flag_count < ?
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [MIN_STATION_FLAGS, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM stations s
       WHERE (SELECT COUNT(*) FROM station_flags f WHERE f.station_id = s.id) < ?`,
      [MIN_STATION_FLAGS]
    );

    const data = rows.map(({ has_refuel, flag_count, created_at, ...s }) => ({
      ...s,
      created_at,
      station_status: computeStationStatus({
        ageDays: daysSince(created_at),
        hasRefuel: !!has_refuel,
        flagCount: flag_count,
      }),
    }));

    res.json({ data, page, limit, total, pages: Math.ceil(total / limit) });
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

    // Filtro de bounding-box em SQL antes do haversine em JS — evita escanear
    // a tabela inteira a cada refresh do mapa (crítico depois da importação
    // nacional da ANP, ~46 mil linhas). O haversine abaixo ainda refina,
    // cortando o excesso que sobra nos cantos do retângulo.
    const { minLat, maxLat, minLng, maxLng } = boundingBox(lat, lng, radius);
    const [stations] = await db.query(
      `SELECT id, name, brand, address, latitude, longitude, created_at FROM stations
       WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
      [minLat, maxLat, minLng, maxLng]
    );

    const nearby = [];
    for (const s of stations) {
      const dist = haversineDistance(lat, lng, parseFloat(s.latitude), parseFloat(s.longitude));
      if (dist <= radius) {
        const { created_at, ...rest } = s;
        nearby.push({ ...rest, distance: Math.round(dist * 10) / 10, _ageDays: daysSince(created_at) });
      }
    }

    if (nearby.length > 0) {
      const ids = nearby.map((s) => s.id);

      // Reputação — uma query agrupada pro conjunto todo, não uma por posto (era o N+1)
      const [allReports] = await db.query(
        'SELECT station_id, type, created_at FROM reports WHERE station_id IN (?) ORDER BY station_id, created_at DESC',
        [ids]
      );
      const reportsByStation = {};
      for (const r of allReports) (reportsByStation[r.station_id] ??= []).push(r);
      for (const s of nearby) {
        const { reputation, score } = buildStats(reportsByStation[s.id] ?? []);
        s.reputation = reputation;
        s.score = score;
      }

      // Preço da gasolina para o card (manual tem prioridade; senão média 15 dias) —
      // duas queries agrupadas para o conjunto todo, não uma por posto
      const [manual] = await db.query(
        `SELECT station_id, price FROM fuel_prices WHERE fuel_type = 'gasoline' AND station_id IN (?)`,
        [ids]
      );
      const [computed] = await db.query(
        `SELECT station_id, ROUND(AVG(total_value / liters), 3) AS avg_price
         FROM refuels
         WHERE fuel_type = 'gasoline' AND station_id IN (?)
           AND refueled_at >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
         GROUP BY station_id`,
        [ids]
      );
      const priceById = {};
      for (const row of computed) priceById[row.station_id] = row.avg_price;
      for (const row of manual) priceById[row.station_id] = row.price;
      for (const s of nearby) s.gas_price = priceById[s.id] ?? null;

      // Status do posto (ver stationStatusService) — mesmo padrão batch acima
      const [refuelRows] = await db.query(
        'SELECT DISTINCT station_id FROM refuels WHERE station_id IN (?)',
        [ids]
      );
      const hasRefuelSet = new Set(refuelRows.map((r) => r.station_id));
      const [flagRows] = await db.query(
        'SELECT station_id, COUNT(*) AS flag_count FROM station_flags WHERE station_id IN (?) GROUP BY station_id',
        [ids]
      );
      const flagCountById = {};
      for (const row of flagRows) flagCountById[row.station_id] = row.flag_count;

      for (const s of nearby) {
        s.station_status = computeStationStatus({
          ageDays: s._ageDays,
          hasRefuel: hasRefuelSet.has(s.id),
          flagCount: flagCountById[s.id] ?? 0,
        });
        delete s._ageDays;
      }
    }

    // Sinalizados (quórum atingido) somem da busca por padrão — só via link direto (getById)
    const visible = nearby.filter((s) => s.station_status !== 'flagged');
    visible.sort((a, b) => a.distance - b.distance);
    res.json(visible);
  } catch (err) {
    next(err);
  }
}

// Sempre retorna o posto independente do status (acesso direto/link preservado,
// mesmo para postos "flagged" ocultos da busca em list/near).
async function getById(req, res, next) {
  try {
    const userId = req.user?.id ?? null;
    const params = [];

    let userFlaggedExpr = '0 AS user_flagged';
    if (userId) {
      userFlaggedExpr = 'EXISTS(SELECT 1 FROM station_flags sf2 WHERE sf2.station_id = s.id AND sf2.user_id = ?) AS user_flagged';
      params.push(userId);
    }
    params.push(req.params.id);

    const [rows] = await db.query(
      `SELECT s.id, s.name, s.brand, s.address, s.latitude, s.longitude, s.created_at,
              s.anp_codigo_simp, s.anp_compliance_flag, s.anp_synced_at,
              EXISTS(SELECT 1 FROM refuels r WHERE r.station_id = s.id) AS has_refuel,
              (SELECT COUNT(*) FROM station_flags f WHERE f.station_id = s.id) AS flag_count,
              ${userFlaggedExpr}
       FROM stations s
       WHERE s.id = ?`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const station = rows[0];
    station.has_refuel = !!station.has_refuel;
    station.user_flagged = !!station.user_flagged;
    station.station_status = computeStationStatus({
      ageDays: daysSince(station.created_at),
      hasRefuel: station.has_refuel,
      flagCount: station.flag_count,
    });

    // Selo neutro de "registrado na ANP" — dado oficial, separado da
    // reputação da comunidade (ver CLAUDE.md, seção de importação ANP).
    const { anp_codigo_simp, anp_compliance_flag, anp_synced_at, ...rest } = station;
    rest.anp = anp_codigo_simp
      ? { registered: true, compliance_flag: !!anp_compliance_flag, synced_at: anp_synced_at }
      : { registered: false };

    res.json(rest);
  } catch (err) {
    next(err);
  }
}

// Sinalizar/desmarcar "este posto não existe" — mesmo padrão de toggle de
// reportsController::toggleVote.
async function toggleFlag(req, res, next) {
  try {
    const stationId = req.params.id;
    const userId = req.user.id;

    const [[exists]] = await db.query(
      'SELECT id FROM station_flags WHERE user_id = ? AND station_id = ?',
      [userId, stationId]
    );

    if (exists) {
      await db.query('DELETE FROM station_flags WHERE user_id = ? AND station_id = ?', [userId, stationId]);
      return res.json({ flagged: false });
    }

    const [[station]] = await db.query('SELECT id FROM stations WHERE id = ?', [stationId]);
    if (!station) return res.status(404).json({ error: 'Posto não encontrado.' });

    await db.query('INSERT INTO station_flags (user_id, station_id) VALUES (?, ?)', [userId, stationId]);
    res.json({ flagged: true });
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

// Resumo agregado de sintomas de combustível citados nas avaliações deste
// posto, separado por tipo de combustível — um posto que vende gasolina e
// diesel pode ter um sintoma citado só por causa de um dos dois; misturar os
// dois enganaria sobre qual combustível tem o problema. Só soma sintomas com
// 2+ menções (por combinação tag+combustível): com 1 só, "resumo agregado" na
// prática reexporia o sintoma daquele relato específico — o que contraria a
// razão de ter escolhido resumo agregado em vez de tag por avaliação individual.
async function getProblemTags(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const [rows] = await db.query(
      `SELECT rt.tag, r.fuel_type, COUNT(*) AS count
       FROM report_tags rt
       JOIN reports r ON r.id = rt.report_id
       WHERE r.station_id = ?
       GROUP BY rt.tag, r.fuel_type
       HAVING count >= 2
       ORDER BY r.fuel_type, count DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getVehicleStats(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    // Só pares de abastecimentos de TANQUE CHEIO contam (e sem parcial no meio,
    // em qualquer posto — ver MEASUREMENTS_CTE em consumptionService.js). A
    // média pública do posto exige usuários DIFERENTES (MIN_DISTINCT_USERS),
    // não só várias medições — senão o hábito de uma pessoa só definiria a
    // média pública.
    // Agrupa só por marca+modelo, sem ano — ano varia demais entre cadastros
    // do "mesmo" carro (digitação, geração do modelo) e fragmentava grupos que
    // já eram pequenos, impedindo a média de bater o mínimo de usuários.
    const [rows] = await db.query(
      MEASUREMENTS_CTE +
      `SELECT v.brand, v.model, m.fuel_type,
              ROUND(AVG(m.consumption), 1) AS avg_consumption, COUNT(*) AS samples
       FROM measurements m
       JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.station_id = ? AND m.consumption BETWEEN 1 AND 40
       GROUP BY v.brand, v.model, m.fuel_type
       HAVING COUNT(DISTINCT m.user_id) >= ?
       ORDER BY v.brand, v.model`,
      [req.params.id, MIN_DISTINCT_USERS]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Abastecimento elegível para avaliação neste posto (o mais recente sem avaliação depois)
// — usado na tela de avaliação pra mostrar posto/bandeira/data/combustível reais.
// Compara com r.created_at (instante real do registro), não r.refueled_at (só a data
// escolhida pelo usuário, sem hora) — senão dois ciclos abastecer→avaliar no mesmo dia
// se atropelam.
async function getReviewableRefuel(req, res, next) {
  try {
    const [[refuel]] = await db.query(
      `SELECT r.fuel_type, r.refueled_at, s.name AS station_name, s.brand AS station_brand
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       WHERE r.user_id = ? AND r.station_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM reports rep
           WHERE rep.user_id = r.user_id AND rep.station_id = r.station_id
             AND rep.created_at >= r.created_at
         )
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT 1`,
      [req.user.id, req.params.id]
    );
    res.json(refuel ?? null);
  } catch (err) {
    next(err);
  }
}

// Abastecimento elegível pra avaliação de ATENDIMENTO (trilha independente de
// combustível/getReviewableRefuel — mesmo padrão, contra service_reviews em
// vez de reports).
async function getReviewableServiceRefuel(req, res, next) {
  try {
    const [[refuel]] = await db.query(
      `SELECT s.name AS station_name, s.brand AS station_brand
       FROM refuels r
       JOIN stations s ON s.id = r.station_id
       WHERE r.user_id = ? AND r.station_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM service_reviews sr
           WHERE sr.user_id = r.user_id AND sr.station_id = r.station_id
             AND sr.created_at >= r.created_at
         )
       ORDER BY r.refueled_at DESC, r.created_at DESC
       LIMIT 1`,
      [req.user.id, req.params.id]
    );
    res.json(refuel ?? null);
  } catch (err) {
    next(err);
  }
}

// Veredito por maioria simples (não é score como a reputação de combustível —
// atendimento é só informativo). Abaixo de MIN_SERVICE_REVIEWS, "sem dados
// suficientes" (mesmo espírito do bucket unknown da reputação).
const MIN_SERVICE_REVIEWS = 3;

async function getServiceStats(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const [rows] = await db.query(
      `SELECT sentiment, COUNT(*) AS count FROM service_reviews WHERE station_id = ? GROUP BY sentiment`,
      [req.params.id]
    );
    const counts = { good: 0, neutral: 0, bad: 0 };
    for (const r of rows) counts[r.sentiment] = r.count;
    const total = counts.good + counts.neutral + counts.bad;

    const sentiment = total >= MIN_SERVICE_REVIEWS
      ? Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b))
      : 'unknown';

    res.json({ sentiment, total, ...counts });
  } catch (err) {
    next(err);
  }
}

// Lista paginada COM o comentário inteiro — diferente de report_tags (só
// resumo agregado), aqui o texto é exibido por completo mesmo.
async function getServiceReviews(req, res, next) {
  try {
    const [station] = await db.query('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!station.length) return res.status(404).json({ error: 'Posto não encontrado.' });

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT id, sentiment, comment, created_at
       FROM service_reviews
       WHERE station_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM service_reviews WHERE station_id = ?',
      [req.params.id]
    );

    res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// Checagem prévia do cooldown anti-fraude (mesma regra de POST /refuels, sem
// inserir nada) — deixa a tela de abastecimento bloquear antes de mostrar o
// formulário, em vez de só descobrir no submit.
async function getRefuelCooldown(req, res, next) {
  try {
    const [[recent]] = await db.query(
      `SELECT created_at FROM refuels
       WHERE user_id = ? AND station_id = ?
         AND created_at >= NOW() - INTERVAL ? HOUR
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, req.params.id, MIN_HOURS_BETWEEN_REFUELS]
    );
    if (!recent) return res.json({ blocked: false, available_at: null });

    const availableAt = new Date(recent.created_at.getTime() + MIN_HOURS_BETWEEN_REFUELS * 3600000);
    res.json({ blocked: true, available_at: availableAt });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create, list, findNear, getById, getStats, getReports, getVehicleStats, getReviewableRefuel,
  toggleFlag, getProblemTags, getRefuelCooldown,
  getReviewableServiceRefuel, getServiceStats, getServiceReviews,
};
