import { useNavigate } from 'react-router-dom';
import ReputationBadge from './ReputationBadge';
import { repColor } from '../constants/reputation';

export default function StationCard({ station }) {
  const navigate = useNavigate();
  const accent = repColor(station.reputation);

  return (
    <button
      type="button"
      onClick={() => navigate(`/stations/${station.id}`)}
      className="relative block w-full text-left bg-navy-800 rounded-xl shadow-md shadow-black/20 cursor-pointer hover:bg-navy-750 hover:shadow-lg active:scale-[0.98] transition-all overflow-hidden"
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

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-navy-600">
          {station.distance !== undefined && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="text-base" aria-hidden="true">📍</span>
              <span>{station.distance} km de distância</span>
            </span>
          )}
          {station.score !== undefined && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              {station.score > 0 ? '+' : ''}{station.score} pts
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
