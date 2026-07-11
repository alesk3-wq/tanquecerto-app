import { stationStatusConfig } from '../constants/stationStatus';

// Espelha ReputationBadge.jsx — badge separado pro sinal de "este posto existe
// de verdade?" (unconfirmed/flagged). Não renderiza nada para status 'active'.
export default function StationStatusBadge({ status, size = 'sm' }) {
  const c = stationStatusConfig(status);
  if (!c) return null;
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{
        color: c.color,
        backgroundColor: `${c.color}1a`,
        border: `1px solid ${c.color}40`,
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}
