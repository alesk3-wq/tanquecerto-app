import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import ReputationBadge from '../components/ReputationBadge';
import { useAuth } from '../contexts/AuthContext';

const FUEL_LABELS  = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };
const FUEL_ORDER   = ['gasoline', 'ethanol', 'diesel', 'gnv'];
const TYPE_CONFIG  = {
  good:    { label: 'Positivo',  icon: '✅', color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-800/40' },
  suspect: { label: 'Suspeito', icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800/40' },
  bad:     { label: 'Negativo', icon: '❌', color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-800/40'    },
};
const HERO_GRADIENT = {
  good:    'from-green-900/40 to-[#0a1628]',
  suspect: 'from-yellow-900/40 to-[#0a1628]',
  bad:     'from-red-900/40 to-[#0a1628]',
  unknown: 'from-slate-800/40 to-[#0a1628]',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'agora mesmo';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return `há ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}`;
}

export default function StationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [station, setStation]   = useState(null);
  const [stats, setStats]       = useState(null);
  const [reports, setReports]   = useState([]);
  const [prices, setPrices]     = useState([]);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [loading, setLoading]   = useState(true);

  // Price form state
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceForm, setPriceForm] = useState({ fuel_type: 'gasoline', price: '' });
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');

  const loadPrices = useCallback(async () => {
    const { data } = await api.get(`/stations/${id}/prices`);
    setPrices(data);
  }, [id]);

  useEffect(() => {
    // Requisições críticas — se falharem, volta ao mapa
    Promise.all([
      api.get(`/stations/${id}`),
      api.get(`/stations/${id}/stats`),
      api.get(`/stations/${id}/reports`),
    ])
      .then(([s, st, r]) => {
        setStation(s.data);
        setStats(st.data);
        setReports(r.data.data);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));

    // Requisições opcionais — não bloqueiam a página
    api.get(`/stations/${id}/prices`).then(({ data }) => setPrices(data)).catch(() => {});
    if (user) {
      api.get(`/favorites/${id}`).then(({ data }) => setFavorited(data.favorited)).catch(() => {});
    }
  }, [id, navigate, user]);

  async function toggleFavorite() {
    if (!user) { navigate('/login'); return; }
    setFavLoading(true);
    try {
      const { data } = await api.post(`/favorites/${id}`);
      setFavorited(data.favorited);
    } finally {
      setFavLoading(false);
    }
  }

  async function handlePriceSubmit(e) {
    e.preventDefault();
    setPriceError('');
    if (!priceForm.price || isNaN(priceForm.price)) { setPriceError('Informe um preço válido.'); return; }
    setPriceLoading(true);
    try {
      await api.post(`/stations/${id}/prices`, {
        fuel_type: priceForm.fuel_type,
        price: parseFloat(priceForm.price),
      });
      await loadPrices();
      setShowPriceForm(false);
      setPriceForm({ fuel_type: 'gasoline', price: '' });
    } catch (err) {
      setPriceError(err.response?.data?.error ?? 'Erro ao salvar preço.');
    } finally {
      setPriceLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!station) return null;

  const rep = stats?.reputation ?? 'unknown';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero header */}
      <div className={`bg-gradient-to-b ${HERO_GRADIENT[rep]} px-4 pt-4 pb-6`}>
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#f59e0b] transition-colors mb-4">
          ← Voltar
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-100 leading-tight">{station.name}</h1>
            {station.brand  && <p className="text-slate-400 mt-1 font-medium">{station.brand}</p>}
            {station.address && <p className="text-sm text-slate-500 mt-1">📍 {station.address}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {stats && <ReputationBadge reputation={rep} size="lg" />}
            {/* Botão favorito */}
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              style={{
                background: favorited ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${favorited ? 'rgba(245,158,11,0.4)' : '#1a2d50'}`,
                borderRadius: 10, padding: '6px 10px',
                cursor: favLoading ? 'not-allowed' : 'pointer',
                fontSize: 18, lineHeight: 1, transition: 'all 0.2s',
                opacity: favLoading ? 0.6 : 1,
              }}
            >
              {favorited ? '⭐' : '☆'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Stats card */}
        {stats && (
          <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] overflow-hidden -mt-2">
            <div className="grid grid-cols-4 divide-x divide-[#1a2d50]">
              <StatBox label="Total"     value={stats.total}   color="text-slate-100" />
              <StatBox label="Positivos" value={stats.good}    color="text-green-400" />
              <StatBox label="Suspeitos" value={stats.suspect} color="text-yellow-400" />
              <StatBox label="Negativos" value={stats.bad}     color="text-red-400" />
            </div>
            {stats.score !== 0 && (
              <div className="px-4 py-3 border-t border-[#1a2d50] flex items-center justify-between">
                <span className="text-sm text-slate-500">Pontuação da comunidade</span>
                <span className={`text-sm font-bold ${stats.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.score > 0 ? '+' : ''}{stats.score} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Preços */}
        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1a2d50]">
            <h2 className="font-semibold text-slate-200">💲 Preços informados</h2>
            {user && (
              <button
                onClick={() => setShowPriceForm((v) => !v)}
                style={{
                  background: showPriceForm ? 'rgba(245,158,11,0.1)' : 'transparent',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b', fontSize: 12, fontWeight: 600,
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                }}
              >
                {showPriceForm ? 'Cancelar' : '+ Informar'}
              </button>
            )}
          </div>

          {/* Form de preço */}
          {showPriceForm && (
            <form onSubmit={handlePriceSubmit} className="px-4 py-3 border-b border-[#1a2d50] flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Combustível</label>
                <select
                  value={priceForm.fuel_type}
                  onChange={(e) => setPriceForm({ ...priceForm, fuel_type: e.target.value })}
                  className="bg-[#060d1f] border border-[#1a2d50] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#f59e0b]/50"
                >
                  {FUEL_ORDER.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Preço (R$)</label>
                <input
                  type="number" step="0.001" min="0.01" max="99.999" required
                  placeholder="5.799"
                  value={priceForm.price}
                  onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  className="w-28 bg-[#060d1f] border border-[#1a2d50] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#f59e0b]/50"
                />
              </div>
              <button
                type="submit" disabled={priceLoading}
                style={{
                  background: '#f59e0b', color: '#060d1f', fontWeight: 700,
                  fontSize: 13, border: 'none', borderRadius: 8,
                  padding: '8px 16px', cursor: 'pointer', opacity: priceLoading ? 0.6 : 1,
                }}
              >
                {priceLoading ? '...' : 'Salvar'}
              </button>
              {priceError && <p className="w-full text-xs text-red-400 mt-1">{priceError}</p>}
            </form>
          )}

          {/* Lista de preços */}
          {prices.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-slate-500 text-sm">Nenhum preço informado ainda.</p>
              {!user && (
                <p className="text-xs text-slate-600 mt-1">
                  <Link to="/login" className="text-[#f59e0b]">Faça login</Link> para informar preços.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-[#1a2d50]">
              {FUEL_ORDER.map((fuel) => {
                const p = prices.find((x) => x.fuel_type === fuel);
                return (
                  <div key={fuel} className="px-4 py-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{FUEL_LABELS[fuel]}</p>
                    {p ? (
                      <>
                        <p className="text-base font-bold text-[#f59e0b]">
                          R$ {parseFloat(p.price).toFixed(3)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(p.updated_at)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTAs */}
        {user ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/stations/${id}/report`)}
              className="bg-[#f59e0b] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#d97706] transition-colors shadow-lg shadow-[#f59e0b]/20 flex items-center justify-center gap-1.5 text-sm"
            >
              ✍️ Avaliar
            </button>
            <button
              onClick={() => navigate(`/stations/${id}/refuel`)}
              className="bg-[#0d1a35] border border-[#1a2d50] text-slate-200 font-bold py-3 rounded-xl hover:border-[#f59e0b]/40 hover:bg-[#0f2147] transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              ⛽ Abastecer
            </button>
          </div>
        ) : (
          <div className="bg-[#0d1a35] rounded-xl border border-[#1a2d50] p-4 text-center">
            <p className="text-sm text-slate-400">
              <Link to="/login" className="text-[#f59e0b] font-semibold hover:underline">Faça login</Link>
              {' '}para avaliar este posto
            </p>
          </div>
        )}

        {/* Relatos */}
        <div>
          <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            Avaliações
            <span className="text-xs font-normal text-slate-500 bg-[#1a2d50] px-2 py-0.5 rounded-full">
              {stats?.total ?? 0}
            </span>
          </h2>

          {reports.length === 0 ? (
            <div className="text-center py-10 bg-[#0d1a35] rounded-2xl border border-dashed border-[#1a2d50]">
              <p className="text-3xl mb-2">🗳️</p>
              <p className="text-slate-500 text-sm">Nenhuma avaliação ainda.</p>
              {user && (
                <button onClick={() => navigate(`/stations/${id}/report`)}
                  className="mt-3 text-sm text-[#f59e0b] hover:underline font-medium">
                  Seja o primeiro a avaliar →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const tc = TYPE_CONFIG[r.type] ?? TYPE_CONFIG.good;
                return (
                  <ReportCard key={r.id} report={r} tc={tc} user={user} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report: r, tc, user }) {
  const navigate = useNavigate();
  const [voted, setVoted]   = useState(r.user_voted);
  const [count, setCount]   = useState(Number(r.vote_count));
  const [busy, setBusy]     = useState(false);

  async function handleVote(e) {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/reports/${r.id}/vote`);
      setVoted(data.voted);
      setCount((c) => data.voted ? c + 1 : c - 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${tc.bg} ${tc.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${tc.color}`}>{tc.icon} {tc.label}</span>
        <span className="text-xs text-slate-500 bg-[#060d1f]/50 px-2 py-0.5 rounded-full">
          {FUEL_LABELS[r.fuel_type] ?? r.fuel_type}
        </span>
      </div>
      {r.description && (
        <p className="text-sm text-slate-300 leading-relaxed">{r.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
        <p className="text-xs text-slate-600">
          {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <button
          onClick={handleVote}
          disabled={busy}
          title="Esse relato me ajudou"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: voted ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${voted ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 8, padding: '3px 10px 3px 8px',
            cursor: busy ? 'not-allowed' : 'pointer',
            color: voted ? '#f59e0b' : '#64748b',
            fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: 14 }}>👍</span>
          {count > 0 && <span>{count}</span>}
          {count === 0 && <span>Útil</span>}
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="py-4 flex flex-col items-center gap-1">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
