const MIN_STATION_FLAGS = 3;
const GRACE_PERIOD_DAYS = 14;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

// Espelha o padrão de reputationService: bucket informativo quando falta dado
// (unconfirmed ~ unknown), e um estado que só muda por sinal explícito da
// comunidade (flagged), nunca por decisão automática de tempo isolada.
function computeStationStatus({ ageDays, hasRefuel, flagCount }) {
  if (flagCount >= MIN_STATION_FLAGS) return 'flagged';
  if (ageDays >= GRACE_PERIOD_DAYS && !hasRefuel) return 'unconfirmed';
  return 'active';
}

module.exports = { computeStationStatus, daysSince, MIN_STATION_FLAGS, GRACE_PERIOD_DAYS };
