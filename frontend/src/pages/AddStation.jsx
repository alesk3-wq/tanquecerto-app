import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, Marker, useMapEvents, useMap } from 'react-leaflet';
import '../lib/leafletSetup';
import api from '../api/api';
import ReputationBadge from '../components/ReputationBadge';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import MapTileLayer from '../components/map/MapTileLayer';
import Button from '../components/Button';
import { DEFAULT_CENTER } from '../constants/map';
import { reverseGeocode } from '../lib/geocode';

// Pino da localização: posiciona por clique no mapa OU arrastando o próprio
// pino (mais natural quando ele já veio marcado pelo GPS e só precisa de ajuste).
function ClickMarker({ position, onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng) });
  if (!position) return null;
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{ dragend: (e) => onSelect(e.target.getLatLng()) }}
    />
  );
}

// Marca o pino automaticamente onde o GPS aponta, pra o usuário só ajustar em
// vez de procurar o ponto do zero. Precisa ser filho do MapContainer pra ter
// acesso ao mapa via useMap() — mesmo padrão do LocateUser em Home.jsx.
//
// Não usa o `setView` embutido do locate(): se o usuário já marcou um ponto à
// mão enquanto o GPS demorava, mover o mapa e trocar o pino embaixo dele seria
// atropelar o que ele fez.
function LocateAndPin({ enabled, onLocated, onError }) {
  const map = useMap();
  const cbRef = useRef({ onLocated, onError });

  useEffect(() => {
    cbRef.current = { onLocated, onError };
  });

  useEffect(() => {
    if (!enabled) return;
    const found = (e) => {
      if (cbRef.current.onLocated(e.latlng)) {
        // Zoom 17: perto o suficiente pra distinguir a bomba da calçada.
        map.setView(e.latlng, 17);
      }
    };
    const failed = () => cbRef.current.onError();
    map.locate({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    map.on('locationfound', found);
    map.on('locationerror', failed);
    return () => {
      map.off('locationfound', found);
      map.off('locationerror', failed);
    };
  }, [map, enabled]);

  return null;
}

// Card compacto de posto próximo (usado no aviso inline e no modal de duplicata)
function NearbyStationRow({ station, onView }) {
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
          onClick={onView}
          className="bg-accent text-navy-950 font-bold text-[11px] rounded-lg px-2.5 py-2 whitespace-nowrap"
        >
          Ver posto
        </button>
      </div>
    </div>
  );
}

export default function AddStation() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPosition = location.state?.initialPosition;
  const [form, setForm] = useState({ name: '', brand: '', address: '' });
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [gpsWarning, setGpsWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  // Pino veio do GPS e ainda não foi ajustado — controla o aviso "reposicione
  // se necessário", que some assim que o usuário mexe.
  const [autoPlaced, setAutoPlaced] = useState(false);
  // Já começa buscando quando não veio posição pronta — o LocateAndPin dispara
  // o locate() assim que o mapa monta.
  const [locating, setLocating] = useState(!initialPosition);
  // Centro só da primeira renderização (o Leaflet ignora mudanças nessa prop —
  // quem move o mapa depois é o LocateAndPin, via useMap). Usa a posição
  // cacheada pra não abrir no meio do país e depois pular pro GPS.
  const [center] = useState(() => {
    if (initialPosition) return [initialPosition.lat, initialPosition.lng];
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

  // Reverse geocoding do endereço
  const [geocoding, setGeocoding] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);

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

  async function fillAddress(lat, lng) {
    setGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    if (address && !addressTouched) setForm((f) => ({ ...f, address }));
    setGeocoding(false);
  }

  function handlePositionSelect(latlng) {
    setPosition(latlng);
    checkNearby(latlng.lat, latlng.lng);
    if (!addressTouched) fillAddress(latlng.lat, latlng.lng);
  }

  // Clique/arraste do usuário: mesma coisa, mas tira o aviso de "veio do GPS".
  function handleManualSelect(latlng) {
    setAutoPlaced(false);
    handlePositionSelect(latlng);
  }

  // Chamado pelo LocateAndPin quando o GPS responde. Devolve se aceitou a
  // posição — se o usuário já marcou algo à mão nesse meio tempo, ignora
  // (e o mapa não se mexe) pra não atropelar a escolha dele.
  function handleGpsLocated(latlng) {
    setLocating(false);
    if (position) return false;
    handlePositionSelect(latlng);
    setAutoPlaced(true);
    return true;
  }

  function handleGpsError() {
    setLocating(false);
    setGpsWarning(true);
  }

  // Posição já veio pronta (ex: fluxo "Você está abastecendo?") — marca no mapa
  // sem precisar de clique manual, e sem acionar o GPS. Os setState acontecem
  // uma vez só, na montagem.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialPosition) handlePositionSelect(initialPosition);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          Você está abastecendo agora?
        </p>
        <div className="flex flex-col gap-3">
          <OverlayPrimaryButton onClick={() => navigate(`/stations/${createdStation.id}/refuel`)}>
            Sim, abastecer agora →
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

        <div className="flex flex-col gap-3 mb-5 text-left">
          {nearbyStations.slice(0, 3).map((s) => (
            <NearbyStationRow key={s.id} station={s} onView={() => navigate(`/stations/${s.id}`)} />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="button" variant="secondary" onClick={doSubmit} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Não, é um posto diferente — cadastrar mesmo assim'}
          </Button>
          <Button type="button" variant="ghost" className="border-none" onClick={() => setShowConfirmModal(false)}>
            ← Voltar ao formulário
          </Button>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Cadastrar novo posto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4 space-y-3">
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
              onChange={(e) => { setAddressTouched(true); setForm({ ...form, address: e.target.value }); }}
              className={inputClass} placeholder="Ex: Av. Paulista, 1000 - São Paulo" />
            {geocoding && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                Buscando endereço...
              </p>
            )}
          </div>
        </div>

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 overflow-hidden">
          <div className="p-4 pb-2">
            <p className="font-medium text-slate-300">Localização *</p>
            <p className="text-sm text-slate-500">
              Toque no mapa ou arraste o pino para ajustar
            </p>
            {locating && !position && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                Buscando sua localização...
              </p>
            )}
            {autoPlaced && (
              <p className="text-xs text-accent mt-1">
                📍 Marcamos onde seu GPS apontou — reposicione se não estiver exato.
              </p>
            )}
            {gpsWarning && !position && (
              <p className="text-xs text-rep-suspect/80 mt-1">
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
              <MapTileLayer />
              <LocateAndPin
                enabled={!initialPosition}
                onLocated={handleGpsLocated}
                onError={handleGpsError}
              />
              <ClickMarker position={position} onSelect={handleManualSelect} />
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
                <NearbyStationRow key={s.id} station={s} onView={() => navigate(`/stations/${s.id}`)} />
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-2.5">
              Se não for o mesmo posto, prossiga normalmente com o cadastro.
            </p>
          </div>
        )}

        <Button type="submit" disabled={loading || checkingNearby}>
          {loading ? 'Cadastrando...' : nearbyStations.length > 0 ? 'Cadastrar mesmo assim' : 'Cadastrar posto'}
        </Button>
      </form>
    </div>
  );
}
