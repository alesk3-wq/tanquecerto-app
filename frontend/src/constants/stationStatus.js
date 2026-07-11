// Espelha constants/reputation.js — status de existência do posto (não é
// reputação, é um sinal separado sobre se o posto existe de verdade no local).
export const STATION_STATUS = {
  unconfirmed: { label: 'Não confirmado', color: '#64748b' }, // mesmo cinza do 'unknown'
  flagged:     { label: 'Pode não existir', color: '#ef4444' }, // mesmo vermelho do 'bad'
};

export function stationStatusConfig(status) {
  return STATION_STATUS[status] ?? null;
}
