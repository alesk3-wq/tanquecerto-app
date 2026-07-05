import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import ReputationBadge from '../components/ReputationBadge';
import ErrorMessage from '../components/ErrorMessage';
import { FUEL_LABELS } from '../constants/fuels';

const TYPE_LABELS = { good: '✅ Positivo', suspect: '⚠️ Suspeito', bad: '❌ Negativo' };

const cardClass =
  'block w-full text-left bg-navy-800 rounded-xl border border-navy-600 p-4 cursor-pointer ' +
  'hover:border-accent/30 hover:bg-navy-750 transition-all active:scale-[0.98]';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('reports');
  const [reports, setReports]     = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [favError, setFavError]   = useState('');

  const [refuels, setRefuels]   = useState([]);
  const [refuelStats, setRefuelStats] = useState({ total: 0, total_liters: 0, total_spent: 0 });

  // setState só após o await; "loading" é ligado pelo estado inicial ou pelo retry
  const loadAll = useCallback(async () => {
    try {
      const [r, f, rf] = await Promise.all([
        api.get('/reports/mine'),
        api.get('/favorites'),
        api.get('/refuels/mine'),
      ]);
      setReports(r.data.data);
      setFavorites(f.data);
      setRefuels(rf.data.data);
      setRefuelStats({ total: rf.data.total, total_liters: rf.data.total_liters, total_spent: rf.data.total_spent });
      setError('');
    } catch {
      setError('Não foi possível carregar seus dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  async function removeFavorite(stationId, e) {
    e.stopPropagation();
    setFavError('');
    try {
      await api.post(`/favorites/${stationId}`);
      // só remove da lista depois que o servidor confirmou
      setFavorites((prev) => prev.filter((s) => s.id !== stationId));
    } catch {
      setFavError('Não foi possível remover o favorito.');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  const positives = reports.filter((r) => r.type === 'good').length;
  const initial   = user.name[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 pt-6 pb-6"
        style={{ background: 'linear-gradient(160deg, #0d2246 0%, #0a1628 70%, #060d1f 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #f59e0b 0%, transparent 50%)' }} />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-navy-950 shadow-lg shadow-accent/20 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl text-slate-100 truncate">{user.name}</h1>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-rep-bad border border-navy-600 hover:border-rep-bad/50 px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
            Sair
          </button>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
          <StatCard value={reports.length}   label="Avaliações"  color="text-accent" />
          <StatCard value={positives}        label="Positivas"   color="text-rep-good" />
          <StatCard value={favorites.length} label="Favoritos"   color="text-slate-300" extra="⭐" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-navy-600 px-4 mt-2">
        {[
          { key: 'reports',   label: 'Avaliações',      count: reports.length },
          { key: 'favorites', label: 'Favoritos',        count: favorites.length, icon: '⭐' },
          { key: 'refuels',   label: 'Abastecimentos',   count: refuelStats.total, icon: '⛽' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.icon && <span aria-hidden="true">{t.icon}</span>}
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-navy-600 text-slate-400">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="px-4 mt-4">
          <ErrorMessage message={error} onRetry={() => { setLoading(true); setError(''); loadAll(); }} />
        </div>
      ) : (
        <div className="px-4 mt-4">

          {/* — TAB AVALIAÇÕES — */}
          {tab === 'reports' && (
            <>
              {reports.length === 0 ? (
                <EmptyState icon="⛽" text="Você ainda não fez nenhuma avaliação." onExplore={() => navigate('/')} />
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <button key={r.id} type="button"
                      className={cardClass}
                      onClick={() => navigate(`/stations/${r.station_id}`)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-200 truncate">{r.station_name}</p>
                          {r.station_brand && <p className="text-xs text-slate-500 mt-0.5">{r.station_brand}</p>}
                        </div>
                        <span className="text-sm whitespace-nowrap flex-shrink-0">{TYPE_LABELS[r.type]}</span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-navy-600">
                        <span className="text-xs text-slate-600 bg-navy-950/50 px-2 py-0.5 rounded-full">
                          {FUEL_LABELS[r.fuel_type]}
                        </span>
                        <span className="text-xs text-slate-600 ml-auto">
                          {new Date(r.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* — TAB ABASTECIMENTOS — */}
          {tab === 'refuels' && (
            <>
              {/* Totais */}
              {refuelStats.total > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <StatCard value={refuelStats.total} label="Total" color="text-accent" />
                  <StatCard value={`${parseFloat(refuelStats.total_liters).toFixed(0)}L`} label="Litros" color="text-slate-300" />
                  <StatCard value={`R$${parseFloat(refuelStats.total_spent).toFixed(0)}`} label="Gasto" color="text-rep-good" />
                </div>
              )}
              {refuels.length === 0 ? (
                <EmptyState icon="⛽" text="Nenhum abastecimento registrado." onExplore={() => navigate('/')} />
              ) : (
                <div className="space-y-3">
                  {refuels.map((r) => (
                    <button key={r.id} type="button"
                      className={cardClass}
                      onClick={() => navigate(`/stations/${r.station_id}`)}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-200 truncate">{r.station_name}</p>
                          {r.station_brand && <p className="text-xs text-slate-500 mt-0.5">{r.station_brand}</p>}
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {new Date(r.refueled_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                          <p className="text-xs text-slate-500">{FUEL_LABELS[r.fuel_type]}</p>
                        </div>
                        <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                          <p className="text-xs font-semibold text-slate-200">{parseFloat(r.liters).toFixed(2)} L</p>
                        </div>
                        <div className="bg-navy-950 rounded-lg px-1 py-1.5">
                          <p className="text-xs font-semibold text-accent">R$ {parseFloat(r.total_value).toFixed(2)}</p>
                        </div>
                      </div>
                      {r.price_per_liter && (
                        <p className="text-xs text-slate-600 mt-2 text-right">R$ {parseFloat(r.price_per_liter).toFixed(3)}/L</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* — TAB FAVORITOS — */}
          {tab === 'favorites' && (
            <>
              {favError && <ErrorMessage message={favError} className="mb-3" />}
              {favorites.length === 0 ? (
                <EmptyState icon="⭐" text="Você ainda não favoritou nenhum posto." onExplore={() => navigate('/')} />
              ) : (
                <div className="space-y-3">
                  {favorites.map((s) => (
                    <div key={s.id}
                      role="button"
                      tabIndex={0}
                      className={cardClass}
                      onClick={() => navigate(`/stations/${s.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/stations/${s.id}`); }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-200 truncate">{s.name}</p>
                          {s.brand   && <p className="text-xs text-slate-500 mt-0.5">{s.brand}</p>}
                          {s.address && <p className="text-xs text-slate-600 mt-0.5 truncate">📍 {s.address}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ReputationBadge reputation={s.reputation} />
                          <button
                            onClick={(e) => removeFavorite(s.id, e)}
                            title="Remover dos favoritos"
                            aria-label={`Remover ${s.name} dos favoritos`}
                            className="text-slate-600 hover:text-rep-bad text-lg transition-colors leading-none"
                          >✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text, onExplore }) {
  return (
    <div className="text-center py-12 bg-navy-800 rounded-2xl border border-dashed border-navy-600">
      <p className="text-3xl mb-2" aria-hidden="true">{icon}</p>
      <p className="text-slate-500 text-sm">{text}</p>
      <button onClick={onExplore}
        className="mt-3 text-sm text-accent hover:underline font-medium">
        Explorar postos →
      </button>
    </div>
  );
}

function StatCard({ value, label, color, extra }) {
  return (
    <div className="bg-navy-950/50 rounded-xl p-3 text-center border border-navy-600/50 shadow-md shadow-black/20">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{extra ? `${extra} ` : ''}{label}</p>
    </div>
  );
}
