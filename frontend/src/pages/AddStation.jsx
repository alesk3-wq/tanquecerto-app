import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import '../lib/leafletSetup';
import api from '../api/api';
import ReputationBadge from '../components/ReputationBadge';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import DarkTileLayer from '../components/map/DarkTileLayer';
import { DEFAULT_CENTER } from '../constants/map';

function ClickMarker({ position, onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng) });
  return position ? <Marker position={position} /> : null;
}

// Card compacto de posto próximo (usado no aviso inline e no modal de duplicata)
function NearbyStationRow({ station, onReview }) {
  return (
    <div className="bg-navy-950 border border-navy-600 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2.5">
      <div className="min-w-0">
        <p className="text-slate-200 font-semibold text-[13px] truncate">{station.name}</p>
        {station.brand && <p className="text-slate-600 text-[11px] mt-0.5">{station.brand}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ReputationBadge reputation={station.reputation} />
        <button
          type="button"
          onClick={onReview}
          className="bg-accent text-navy-950 font-bold text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap"
        >
          Avaliar
        </button>
      </div>
    </div>
  );
}

export default function AddStation() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', brand: '', address: '' });
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [gpsWarning, setGpsWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  // Centro inicial: posição cacheada, senão o padrão (GPS tenta melhorar depois)
  const [center, setCenter] = useState(() => {
    const cached = localStorage.getItem('tanquecerto_pos');
    if (!cached) return DEFAULT_CENTER;
    const pos = JSON.parse(cached);
    return [pos.lat, pos.lng];
  });
  const [createdStation, setCreatedStation] = useState(null);

  // Duplicate detection
  const [nearbyStations, setNearbyStations] = useState([]);
  const [checkingNearby, setCheckingNearby] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('tanquecerto_pos')) return;
    navigator.geolocation?.getCurrentPosition(
      (p) => setCenter([p.coords.latitude, p.coords.longitude]),
      () => setGpsWarning(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const checkNearby = useCallback(async (lat, lng) => {
    setCheckingNearby(true);
    setNearbyStations([]);
    try {
      const { data } = await api.get('/stations/near', {
        params: { lat, lng, radius: 0.1 }, // 100 metros
      });
      setNearbyStations(data);
    } catch {
      // não bloqueia o cadastro
    } finally {
      setCheckingNearby(false);
    }
  }, []);

  function handlePositionSelect(latlng) {
    setPosition(latlng);
    checkNearby(latlng.lat, latlng.lng);
  }

  async function doSubmit() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/stations', {
        ...form,
        latitude: position.lat,
        longitude: position.lng,
      });
      setCreatedStation(data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao cadastrar posto.');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!position) { setError('Clique no mapa para marcar a localização do posto.'); return; }
    if (nearbyStations.length > 0) {
      setShowConfirmModal(true);
      return;
    }
    doSubmit();
  }

  const inputClass = "w-full bg-navy-950 border border-navy-600 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder-slate-600";

  // — Tela de sucesso —
  if (createdStation) {
    return (
      <SuccessOverlay icon="✅" iconTone="good" title="Posto cadastrado!">
        <p className="text-rep-unknown text-sm mb-1.5">
          <span className="text-slate-400 font-medium">{createdStation.name}</span> foi adicionado ao mapa.
        </p>
        <p className="text-slate-600 text-sm mb-7">
          Deseja fazer a primeira avaliação deste posto?
        </p>
        <div className="flex flex-col gap-2.5">
          <OverlayPrimaryButton onClick={() => navigate(`/stations/${createdStation.id}/report`)}>
            Sim, avaliar agora →
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate('/')}>
            Não, voltar ao mapa
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  // — Modal de confirmação de duplicata —
  if (showConfirmModal) {
    return (
      <SuccessOverlay icon="⚠️" iconTone="warn" title="Posto já cadastrado?">
        <p className="text-rep-unknown text-[13px] leading-relaxed mb-5">
          Encontramos {nearbyStations.length} posto(s) a menos de 100m desta localização. É um deles?
        </p>

        <div className="flex flex-col gap-2 mb-5 text-left">
          {nearbyStations.slice(0, 3).map((s) => (
            <NearbyStationRow key={s.id} station={s} onReview={() => navigate(`/stations/${s.id}/report`)} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={doSubmit}
            disabled={loading}
            className="w-full bg-white/[0.06] border border-navy-600 text-slate-400 font-semibold text-[13px] rounded-xl py-3 disabled:opacity-60 hover:text-slate-200 transition-colors"
          >
            {loading ? 'Cadastrando...' : 'Não, é um posto diferente — cadastrar mesmo assim'}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmModal(false)}
            className="w-full bg-transparent border-none text-slate-600 text-[13px] py-2 hover:text-slate-400 transition-colors"
          >
            ← Voltar ao formulário
          </button>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-accent transition-colors">
        ← Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-100">Cadastrar novo posto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 p-4 space-y-3">
          <div>
            <label htmlFor="station-name" className="block text-sm font-medium text-slate-300 mb-1.5">Nome do posto *</label>
            <input id="station-name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} placeholder="Ex: Posto Ipiranga Centro" />
          </div>
          <div>
            <label htmlFor="station-brand" className="block text-sm font-medium text-slate-300 mb-1.5">Bandeira</label>
            <input id="station-brand" value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className={inputClass} placeholder="Ex: Ipiranga, Shell, Petrobras..." />
          </div>
          <div>
            <label htmlFor="station-address" className="block text-sm font-medium text-slate-300 mb-1.5">Endereço</label>
            <input id="station-address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass} placeholder="Ex: Av. Paulista, 1000 - São Paulo" />
          </div>
        </div>

        <div className="bg-navy-800 rounded-2xl border border-navy-600 overflow-hidden">
          <div className="p-4 pb-2">
            <p className="font-medium text-slate-300">Localização *</p>
            <p className="text-sm text-slate-500">Clique no mapa para marcar o posto</p>
            {gpsWarning && !position && (
              <p className="text-xs text-yellow-400/80 mt-1">
                ⚠️ Não foi possível obter sua localização — navegue no mapa e marque manualmente.
              </p>
            )}
            {checkingNearby && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                Verificando postos próximos...
              </p>
            )}
            {position && !checkingNearby && nearbyStations.length === 0 && (
              <p className="text-xs text-rep-good mt-1">✓ Localização marcada — nenhum posto duplicado encontrado</p>
            )}
            {position && !checkingNearby && nearbyStations.length > 0 && (
              <p className="text-xs text-rep-suspect mt-1">
                ⚠️ {nearbyStations.length} posto(s) já cadastrado(s) nesta área
              </p>
            )}
          </div>
          <div style={{ height: 280 }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <DarkTileLayer />
              <ClickMarker position={position} onSelect={handlePositionSelect} />
            </MapContainer>
          </div>
        </div>

        {/* Aviso inline de postos próximos */}
        {!checkingNearby && nearbyStations.length > 0 && (
          <div className="bg-rep-suspect/[0.06] border border-rep-suspect/25 rounded-[14px] px-4 py-3.5">
            <p className="text-rep-suspect font-semibold text-[13px] mb-2.5">
              ⚠️ Posto já cadastrado nesta região?
            </p>
            <div className="flex flex-col gap-2">
              {nearbyStations.slice(0, 3).map((s) => (
                <NearbyStationRow key={s.id} station={s} onReview={() => navigate(`/stations/${s.id}/report`)} />
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-2.5">
              Se não for o mesmo posto, prossiga normalmente com o cadastro.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading || checkingNearby}
          className="w-full bg-accent text-navy-950 font-bold py-3 rounded-xl hover:bg-accent-dark disabled:opacity-50 transition-colors"
        >
          {loading ? 'Cadastrando...' : nearbyStations.length > 0 ? 'Cadastrar mesmo assim' : 'Cadastrar posto'}
        </button>
      </form>
    </div>
  );
}
