const SCORE_MAP = { good: 2, suspect: -1, bad: -2 };
const MIN_REPORTS = 3;

function calculateReputation(reports) {
  if (!reports || reports.length < MIN_REPORTS) {
    return { reputation: 'unknown', score: 0, total: reports?.length ?? 0 };
  }

  const score = reports.reduce((acc, r) => acc + (SCORE_MAP[r.type] ?? 0), 0);
  let reputation;

  if (score >= 5) reputation = 'good';
  else if (score >= 1) reputation = 'suspect';
  else reputation = 'bad';

  return { reputation, score, total: reports.length };
}

function buildStats(reports) {
  const counts = { good: 0, suspect: 0, bad: 0 };
  for (const r of reports) counts[r.type] = (counts[r.type] ?? 0) + 1;
  const { reputation, score } = calculateReputation(reports);
  const lastReport = reports.length ? reports[0].created_at : null;

  return { total: reports.length, ...counts, reputation, score, lastReport };
}

module.exports = { calculateReputation, buildStats };
