// Fonte única das cores/labels de reputação para uso em JS
// (SVG de marcadores, styles inline). Os mesmos hex existem como
// tokens Tailwind em src/index.css (@theme). Manter em sincronia.
export const REPUTATION = {
  good:    { label: 'Confiável',    color: '#00e676' },
  suspect: { label: 'Suspeito',     color: '#facc15' },
  bad:     { label: 'Problemático', color: '#ef4444' },
  unknown: { label: 'Sem dados',    color: '#64748b' },
};

export function repConfig(reputation) {
  return REPUTATION[reputation] ?? REPUTATION.unknown;
}

export function repColor(reputation) {
  return repConfig(reputation).color;
}
