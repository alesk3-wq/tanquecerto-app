import { useNavigate } from 'react-router-dom';
import ReputationBadge from './ReputationBadge';

const ACCENT = {
  good:    '#00e676',
  suspect: '#facc15',
  bad:     '#ef4444',
  unknown: '#475569',
};

export default function StationCard({ station }) {
  const navigate = useNavigate();
  const accent = ACCENT[station.reputation] ?? ACCENT.unknown;

  return (
    <div
      onClick={() => navigate(`/stations/${station.id}`)}
      className="relative bg-[#0d1a35] rounded-xl cursor-pointer hover:bg-[#0f2147] active:scale-[0.98] transition-all overflow-hidden"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-100 leading-tight truncate">{station.name}</h3>
            {station.brand && (
              <p className="text-sm text-slate-400 mt-0.5">{station.brand}</p>
            )}
            {station.address && (
              <p className="text-xs text-slate-500 mt-1 truncate">{station.address}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <ReputationBadge reputation={station.reputation} />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a2d50]">
          {station.distance !== undefined && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="text-base">📍</span>
              <span>{station.distance} km de distância</span>
            </span>
          )}
          {station.score !== undefined && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
              {station.score > 0 ? '+' : ''}{station.score} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
