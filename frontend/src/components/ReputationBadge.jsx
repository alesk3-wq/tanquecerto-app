const CONFIG = {
  good:    { label: 'Confiável',    color: '#00e676' },
  suspect: { label: 'Suspeito',     color: '#facc15' },
  bad:     { label: 'Problemático', color: '#ef4444' },
  unknown: { label: 'Sem dados',    color: '#64748b' },
};

export default function ReputationBadge({ reputation, size = 'sm' }) {
  const c = CONFIG[reputation] ?? CONFIG.unknown;
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
