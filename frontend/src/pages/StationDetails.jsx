import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import ReputationBadge from '../components/ReputationBadge';
import StationStatusBadge from '../components/StationStatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { FUEL_LABELS, FUEL_ORDER } from '../constants/fuels';
import { REPORT_TAG_LABELS } from '../constants/reportTags';
import { REFUEL_CHECK_RADIUS_KM } from '../constants/map';
import { haversineKm } from '../lib/distance';

// Sentimento de atendimento — trilha separada da reputação de combustível
// (Total/Positivos/Suspeitos/Negativos no card de stats), nunca entra no score.
const SERVICE_SENTIMENT_CONFIG = {
  good:    { label: 'Bom',    icon: '🙂', color: 'text-rep-good',    bg: 'bg-rep-good/10',    border: 'border-rep-good/30'    },
  neutral: { label: 'Neutro', icon: '😐', color: 'text-rep-suspect', bg: 'bg-rep-suspect/10', border: 'border-rep-suspect/30' },
  bad:     { label: 'Ruim',   icon: '🙁', color: 'text-rep-bad',     bg: 'bg-rep-bad/10',     border: 'border-rep-bad/30'     },
};
const HERO_GRADIENT = {
  good:    'from-rep-good/20 to-navy-900',
  suspect: 'from-rep-suspect/20 to-navy-900',
  bad:     'from-rep-bad/20 to-navy-900',
  unknown: 'from-slate-800/40 to-navy-900',
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
  const [prices, setPrices]     = useState([]);
  const [problemTags, setProblemTags] = useState([]);
  const [vehicleStats, setVehicleStats] = useState([]);
  const [serviceStats, setServiceStats] = useState(null);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState('');
  const [loading, setLoading]   = useState(true);
  const [pageError, setPageError] = useState('');

  // Sinalizar "este posto não existe" — só disponível pra quem está fisicamente
  // no local (mesmo raio de GPS do abastecimento), pra evitar sinalização remota.
  const [flagged, setFlagged]   = useState(false);
  const [flagBusy, setFlagBusy] = useState(false);
  const [flagError, setFlagError] = useState(false);
  // Confirmação antes de marcar (não antes de desmarcar) — evita toque
  // acidental virar sinalização, sem atrapalhar quem quer desfazer um erro.
  const [confirmFlag, setConfirmFlag] = useState(false);
  const [nearStation, setNearStation] = useState(false);

  // Price form state
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceForm, setPriceForm] = useState({ fuel_type: 'gasoline', price: '' });
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');

  const loadPrices = useCallback(async () => {
    const { data } = await api.get(`/stations/${id}/prices`);
    setPrices(data);
  }, [id]);

  // setState só após o await; "loading" é ligado pelo estado inicial ou pelo retry
  const loadStation = useCallback(async () => {
    try {
      const [s, st, vs] = await Promise.all([
        api.get(`/stations/${id}`),
        api.get(`/stations/${id}/stats`),
        api.get(`/stations/${id}/vehicle-stats`),
      ]);
      setStation(s.data);
      setFlagged(!!s.data.user_flagged);
      setStats(st.data);
      setVehicleStats(vs.data);
      setPageError('');
    } catch (err) {
      // Posto inexistente → volta ao mapa; outros erros → mensagem com retry
      if (err.response?.status === 404) {
        navigate('/');
        return;
      }
      setPageError('Não foi possível carregar o posto.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStation();

    // Requisições opcionais — não bloqueiam a página
    api.get(`/stations/${id}/prices`).then(({ data }) => setPrices(data)).catch(() => {});
    api.get(`/stations/${id}/problem-tags`).then(({ data }) => setProblemTags(data)).catch(() => {});
    api.get(`/stations/${id}/service-stats`).then(({ data }) => setServiceStats(data)).catch(() => {});
    api.get(`/stations/${id}/service-reviews`).then(({ data }) => setServiceReviews(data.data)).catch(() => {});
    if (user) {
      api.get(`/favorites/${id}`).then(({ data }) => setFavorited(data.favorited)).catch(() => {});
    }
  }, [id, user, loadStation]);

  // Checagem silenciosa de GPS só pra decidir se mostra o botão de sinalizar
  // (sem UI de "verificando/tentar de novo" como no abastecimento — aqui é opcional).
  useEffect(() => {
    if (!station || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(pos.coords.latitude, pos.coords.longitude, parseFloat(station.latitude), parseFloat(station.longitude));
        setNearStation(km <= REFUEL_CHECK_RADIUS_KM);
      },
      () => setNearStation(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [station]);

  async function toggleFavorite() {
    if (!user) { navigate('/login'); return; }
    setFavLoading(true);
    setFavError('');
    try {
      const { data } = await api.post(`/favorites/${id}`);
      setFavorited(data.favorited);
    } catch {
      setFavError('Não foi possível atualizar o favorito.');
    } finally {
      setFavLoading(false);
    }
  }

  async function toggleFlag() {
    if (!user) { navigate('/login'); return; }
    if (flagBusy) return;
    setConfirmFlag(false);
    setFlagBusy(true);
    setFlagError(false);
    try {
      const { data } = await api.post(`/stations/${id}/flag`);
      setFlagged(data.flagged);
    } catch {
      setFlagError(true);
    } finally {
      setFlagBusy(false);
    }
  }

  // Toque no botão: se ainda não está marcado, pede confirmação primeiro
  // (fácil de tocar sem querer). Desmarcar (corrigir um toque errado)
  // continua direto, sem confirmação extra.
  function handleFlagClick() {
    if (!user) { navigate('/login'); return; }
    if (flagged) { toggleFlag(); return; }
    setConfirmFlag(true);
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
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (pageError) return (
    <div className="max-w-2xl mx-auto p-4">
      <ErrorMessage
        message={pageError}
        onRetry={() => { setLoading(true); setPageError(''); loadStation(); }}
      />
    </div>
  );

  if (!station) return null;

  const rep = stats?.reputation ?? 'unknown';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero header */}
      <div className={`bg-gradient-to-b ${HERO_GRADIENT[rep]} px-4 pt-4 pb-6`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-100 leading-tight">{station.name}</h1>
            {station.brand  && <p className="text-slate-400 mt-1 font-medium">{station.brand}</p>}
            {station.address && <p className="text-sm text-slate-500 mt-1">📍 {station.address}</p>}
            {station.anp?.registered && (
              <p className="text-xs text-slate-600 mt-1">
                Registrado na ANP · {station.anp.compliance_flag
                  ? 'pendência no monitoramento de qualidade'
                  : 'situação regular'}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {stats && <ReputationBadge reputation={rep} size="lg" />}
            {serviceStats && serviceStats.sentiment !== 'unknown' && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full font-medium px-2 py-0.5 text-xs border
                  ${SERVICE_SENTIMENT_CONFIG[serviceStats.sentiment].bg}
                  ${SERVICE_SENTIMENT_CONFIG[serviceStats.sentiment].color}
                  ${SERVICE_SENTIMENT_CONFIG[serviceStats.sentiment].border}`}
              >
                {SERVICE_SENTIMENT_CONFIG[serviceStats.sentiment].icon} Atendimento: {SERVICE_SENTIMENT_CONFIG[serviceStats.sentiment].label}
              </span>
            )}
            <StationStatusBadge status={station.station_status} />
            {/* Botão favorito */}
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              aria-pressed={favorited}
              aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`w-11 h-11 flex items-center justify-center rounded-xl text-lg leading-none border transition-all
                ${favorited ? 'bg-accent/15 border-accent/40' : 'bg-white/5 border-navy-600'}
                ${favLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {favorited ? '⭐' : '☆'}
            </button>
          </div>
        </div>
        {favError && <p className="text-xs text-rep-bad text-right mt-2">{favError}</p>}
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Stats card */}
        {stats && (
          <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 overflow-hidden -mt-2">
            <div className="grid grid-cols-4 divide-x divide-navy-600">
              <StatBox label="Total"     value={stats.total}   color="text-slate-100" />
              <StatBox label="Positivos" value={stats.good}    color="text-rep-good" />
              <StatBox label="Suspeitos" value={stats.suspect} color="text-rep-suspect" />
              <StatBox label="Negativos" value={stats.bad}     color="text-rep-bad" />
            </div>
            {stats.score !== 0 && (
              <div className="px-4 py-3 border-t border-navy-600 flex items-center justify-between">
                <span className="text-sm text-slate-500">Pontuação da comunidade</span>
                <span className={`text-sm font-bold ${stats.score > 0 ? 'text-rep-good' : 'text-rep-bad'}`}>
                  {stats.score > 0 ? '+' : ''}{stats.score} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Problemas mais citados — resumo agregado, nunca por avaliação
            individual (só sintomas com 2+ menções por combustível, ver
            backend). Separado por combustível: um sintoma só na gasolina não
            deve parecer que é geral do posto. */}
        {problemTags.length > 0 && (
          <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-navy-600">
              <h2 className="font-semibold text-slate-200">⚠️ Problemas mais citados</h2>
            </div>
            {FUEL_ORDER.filter((fuel) => problemTags.some((pt) => pt.fuel_type === fuel)).map((fuel) => (
              <div key={fuel} className="border-b border-navy-600 last:border-b-0">
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {FUEL_LABELS[fuel]}
                </p>
                <div className="divide-y divide-navy-600">
                  {problemTags.filter((pt) => pt.fuel_type === fuel).map((pt) => (
                    <div key={`${pt.tag}-${pt.fuel_type}`} className="px-4 py-3 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-300">{REPORT_TAG_LABELS[pt.tag] ?? pt.tag}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rep-bad/10 text-rep-bad flex-shrink-0">
                        {pt.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Consumo médio por veículo */}
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-navy-600">
            <h2 className="font-semibold text-slate-200">🚗 Consumo médio por veículo</h2>
          </div>
          {vehicleStats.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-slate-500 text-sm">Ainda não há consumo suficiente registrado aqui.</p>
              <p className="text-slate-600 text-xs mt-1.5 px-4">
                A média aparece depois que pelo menos 3 usuários diferentes
                completarem o tanque aqui com o mesmo veículo (marcando "Completei
                o tanque" ao abastecer).
              </p>
            </div>
          ) : (
            <div className="divide-y divide-navy-600">
              {vehicleStats.map((v, i) => (
                <div key={i} className="px-4 py-3.5">
                  <p className="text-sm text-slate-300 leading-snug">
                    Neste posto, o{' '}
                    <span className="font-semibold text-slate-100">{v.brand} {v.model}</span>{' '}
                    tem feito
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-accent">{v.avg_consumption}</span>
                    <span className="text-sm text-slate-400">km/l de média</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {FUEL_LABELS[v.fuel_type] ?? v.fuel_type} · {v.samples} abastecimento{v.samples > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preços */}
        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-navy-600">
            <h2 className="font-semibold text-slate-200">💲 Preços informados</h2>
            {user && (
              <button
                onClick={() => setShowPriceForm((v) => !v)}
                className={`text-xs font-semibold text-accent border border-accent/30 rounded-lg px-3 py-2 min-h-[38px] transition-colors
                  ${showPriceForm ? 'bg-accent/10' : 'bg-transparent hover:bg-accent/5'}`}
              >
                {showPriceForm ? 'Cancelar' : '+ Informar'}
              </button>
            )}
          </div>

          {/* Form de preço */}
          {showPriceForm && (
            <form onSubmit={handlePriceSubmit} className="px-4 py-3 border-b border-navy-600 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Combustível</label>
                <select
                  value={priceForm.fuel_type}
                  onChange={(e) => setPriceForm({ ...priceForm, fuel_type: e.target.value })}
                  className="bg-navy-950 border border-navy-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
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
                  className="w-28 bg-navy-950 border border-navy-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
                />
              </div>
              <Button type="submit" size="md" disabled={priceLoading} className="px-4">
                {priceLoading ? '...' : 'Salvar'}
              </Button>
              {priceError && <p className="w-full text-xs text-rep-bad mt-1">{priceError}</p>}
            </form>
          )}

          {/* Lista de preços */}
          {prices.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-slate-500 text-sm">Nenhum preço informado ainda.</p>
              {!user && (
                <p className="text-xs text-slate-600 mt-1">
                  <Link to="/login" className="text-accent">Faça login</Link> para informar preços.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-navy-600">
              {FUEL_ORDER.map((fuel) => {
                const p = prices.find((x) => x.fuel_type === fuel);
                return (
                  <div key={fuel} className="px-4 py-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{FUEL_LABELS[fuel]}</p>
                    {p?.price ? (
                      <>
                        <p className="text-base font-bold text-accent">
                          R$ {parseFloat(p.price).toFixed(3)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(p.updated_at)}</p>
                      </>
                    ) : p?.avg_price ? (
                      <>
                        <p className="text-base font-bold text-rep-unknown">
                          R$ {parseFloat(p.avg_price).toFixed(3)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">média · {p.avg_samples} abast.</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">—</p>
                    )}
                    {p?.avg_price && p?.price && (
                      <p className="text-[10px] text-slate-600 mt-1.5 pt-1.5 border-t border-navy-600/60">
                        méd. abastec. R$ {parseFloat(p.avg_price).toFixed(3)}
                        <br />({p.avg_samples})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aviso não bloqueante — posto atingiu o quórum de sinalização comunitária.
            O abastecimento continua liberado normalmente: um abastecimento real
            aqui é contraevidência útil. */}
        {station.station_status === 'flagged' && (
          <div className="bg-rep-bad/10 border border-rep-bad/30 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-xl leading-none" aria-hidden="true">⚠️</span>
            <p className="text-sm text-rep-bad">
              Vários usuários não encontraram este posto no endereço indicado.
              Se você abastecer aqui, ajude a confirmar registrando o abastecimento.
            </p>
          </div>
        )}

        {/* Abastecer saiu daqui — já coberto no mapa (popup do marcador +
            botão flutuante), sem duplicar a ação. */}
        {!user && (
          <div className="bg-navy-800 rounded-xl border border-navy-600 p-4 text-center">
            <p className="text-sm text-slate-400">
              <Link to="/login" className="text-accent font-semibold hover:underline">Faça login</Link>
              {' '}para favoritar e avaliar este posto
            </p>
          </div>
        )}

        {/* Sinalizar posto inexistente — só aparece pra quem está fisicamente no local */}
        {user && nearStation && (
          <div>
            {confirmFlag ? (
              <div className="bg-rep-bad/10 border border-rep-bad/30 rounded-lg px-3.5 py-3 flex items-center justify-between gap-2">
                <p className="text-xs text-rep-bad">
                  Confirma que não encontrou este posto no endereço indicado?
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setConfirmFlag(false)}
                    className="text-xs font-semibold text-slate-400 border border-navy-600 rounded-lg px-3 py-1.5">
                    Cancelar
                  </button>
                  <button type="button" onClick={toggleFlag} disabled={flagBusy}
                    className="text-xs font-semibold text-white bg-rep-bad rounded-lg px-3 py-1.5 disabled:opacity-60">
                    Sim
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFlagClick}
                disabled={flagBusy}
                aria-pressed={flagged}
                className={`w-full text-center text-xs font-semibold rounded-lg px-3 py-2.5 border transition-colors
                  ${flagged ? 'bg-rep-bad/10 border-rep-bad/30 text-rep-bad' : 'bg-transparent border-navy-600 text-slate-500 hover:text-rep-bad hover:border-rep-bad/30'}
                  ${flagBusy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {flagged ? '🚩 Você reportou que este posto não existe' : '🚩 Não encontrei este posto aqui'}
              </button>
            )}
            {flagError && <p className="text-xs text-rep-bad text-center mt-1.5">Falhou, tente de novo.</p>}
          </div>
        )}

        {/* Atendimento e estrutura — trilha separada de combustível, com
            texto livre (risco de acusação infundada é específico de
            adulteração de combustível, não se aplica aqui). Não entra na
            reputação do posto. */}
        <div>
          <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            Atendimento e estrutura
            <span className="text-xs font-normal text-slate-500 bg-navy-600 px-2 py-0.5 rounded-full">
              {serviceReviews.length}
            </span>
          </h2>

          {serviceReviews.length === 0 ? (
            <div className="text-center py-10 bg-navy-800 rounded-2xl border border-dashed border-navy-600">
              <p className="text-3xl mb-2" aria-hidden="true">💬</p>
              <p className="text-slate-500 text-sm">Nenhuma avaliação de atendimento ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {serviceReviews.map((sr) => {
                const sc = SERVICE_SENTIMENT_CONFIG[sr.sentiment] ?? SERVICE_SENTIMENT_CONFIG.neutral;
                return (
                  <div key={sr.id} className={`rounded-xl border p-4 ${sc.bg} ${sc.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${sc.color}`}>{sc.icon} {sc.label}</span>
                      <span className="text-xs text-slate-600">
                        {new Date(sr.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {sr.comment && (
                      <p className="text-sm text-slate-300 leading-relaxed mt-2 pt-2 border-t border-black/10">
                        {sr.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
