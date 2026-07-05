import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from '../lib/leafletSetup';
import api from '../api/api';
import StationCard from '../components/StationCard';
import ReputationBadge from '../components/ReputationBadge';
import ErrorMessage from '../components/ErrorMessage';
import MapTileLayer from '../components/map/MapTileLayer';
import { DEFAULT_CENTER } from '../constants/map';
import { repColor } from '../constants/reputation';

function openRoute(userPos, station) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${station.latitude},${station.longitude}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function createMarkerIcon(reputation) {
  const color = repColor(reputation);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36" style="filter: drop-shadow(0 3px 5px rgba(6,13,31,0.35))">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 24 12 24s12-16 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="rgba(6,13,31,0.25)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.95)"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// Armazena os últimos callbacks sem re-registrar os eventos.
// Remontar via `key` reexecuta o map.locate() (usado no "Tentar novamente").
function LocateUser({ onLocation, onError }) {
  const map = useMap();
  const cbRef = useRef({ onLocation, onError });

  useEffect(() => {
    cbRef.current = { onLocation, onError };
  });

  useEffect(() => {
    const found = (e) => cbRef.current.onLocation(e.latlng);
    const failed = (e) => cbRef.current.onError(e);
    map.locate({ setView: true, maxZoom: 14 });
    map.on('locationfound', found);
    map.on('locationerror', failed);
    return () => {
      map.off('locationfound', found);
      map.off('locationerror', failed);
    };
  }, [map]);

  return null;
}

function cachedPosition() {
  const cached = localStorage.getItem('tanquecerto_pos');
  return cached ? JSON.parse(cached) : null;
}

export default function Home() {
  const [stations, setStations] = useState([]);
  // Posição cacheada no localStorage (fix: recarrega ao voltar para Home)
  const [userPos, setUserPos] = useState(cachedPosition);
  const [loading, setLoading] = useState(() => !!cachedPosition());
  const [error, setError] = useState('');
  const [gpsError, setGpsError] = useState(false);
  const [gpsRetry, setGpsRetry] = useState(0);
  const [radius, setRadius] = useState(5);
  const navigate = useNavigate();

  // setState só após o await — o "loading" é ligado por quem chama (evento) ou pelo estado inicial
  const loadNear = useCallback(async (lat, lng, r) => {
    try {
      const { data } = await api.get('/stations/near', { params: { lat, lng, radius: r } });
      setStations(data);
      setError('');
    } catch {
      setError('Não foi possível buscar os postos próximos.');
    } finally {
      setLoading(false);
    }
  }, []);

  function refresh(lat, lng, r) {
    setLoading(true);
    setError('');
    loadNear(lat, lng, r);
  }

  // Busca inicial com a posição cacheada — roda apenas no mount.
  // Fetch-on-mount: os setState acontecem após o await, não sincronamente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userPos) loadNear(userPos.lat, userPos.lng, radius);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleLocation(latlng) {
    const pos = { lat: latlng.lat, lng: latlng.lng };
    setGpsError(false);
    setUserPos(pos);
    localStorage.setItem('tanquecerto_pos', JSON.stringify(pos));
    refresh(pos.lat, pos.lng, radius);
  }

  function handleLocationError() {
    // Sem posição cacheada nem GPS: avisa o usuário em vez de esperar para sempre
    setGpsError(true);
  }

  function handleRadiusChange(r) {
    setRadius(r);
    if (userPos) refresh(userPos.lat, userPos.lng, r);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapContainer
          center={userPos ? [userPos.lat, userPos.lng] : DEFAULT_CENTER}
          zoom={userPos ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <MapTileLayer />
          <LocateUser key={gpsRetry} onLocation={handleLocation} onError={handleLocationError} />

          {/* Marcador do usuário */}
          {userPos && (
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{ fillColor: '#f59e0b', fillOpacity: 1, color: '#060d1f', weight: 2 }}
            />
          )}

          {stations.map((s) => (
            <Marker
              key={s.id}
              position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
              icon={createMarkerIcon(s.reputation)}
            >
              <Popup minWidth={210}>
                <div style={{ width: 210, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {/* Cabeçalho */}
                  <div className="px-4 pt-3.5 pb-3 border-b border-navy-600">
                    <p className="text-slate-100 font-semibold text-sm leading-snug m-0">
                      {s.name}
                    </p>
                    {s.brand && (
                      <p className="text-slate-600 text-xs mt-1 m-0">{s.brand}</p>
                    )}
                  </div>

                  {/* Info + botões */}
                  <div className="px-4 pt-3 pb-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <ReputationBadge reputation={s.reputation} />
                      <span className="text-slate-600 text-xs">📍 {s.distance} km</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {userPos && (
                        <button
                          onClick={() => openRoute(userPos, s)}
                          className="w-full min-h-[40px] bg-rep-good text-navy-950 font-bold text-[13px] rounded-xl px-3 py-2.5 shadow-lg shadow-rep-good/20 cursor-pointer active:scale-[0.97] transition-transform"
                        >
                          ⛽ Abastecer
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/stations/${s.id}`)}
                        className="w-full min-h-[40px] bg-white/[0.04] border border-navy-600 text-slate-400 font-medium text-[13px] rounded-xl px-3 py-2 cursor-pointer active:scale-[0.97] transition-transform"
                      >
                        Ver detalhes →
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom panel — bottom sheet flutuante, estilo app de navegação */}
      <div
        className="bg-navy-900 rounded-t-3xl -mt-4 relative z-10 shadow-[0_-12px_32px_rgba(0,0,0,0.35)]"
        style={{ maxHeight: '45dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1.5 sticky top-0 bg-navy-900 rounded-t-3xl">
          <div className="w-10 h-1.5 rounded-full bg-navy-600" />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                Postos próximos
                {!loading && stations.length > 0 && (
                  <span className="text-xs font-normal text-slate-500 bg-navy-600 px-2 py-0.5 rounded-full">
                    {stations.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userPos
                  ? loading ? 'Buscando postos...' : `Raio de ${radius} km`
                  : gpsError ? 'GPS indisponível' : 'Aguardando localização GPS...'}
              </p>
            </div>
            {userPos && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => refresh(userPos.lat, userPos.lng, radius)}
                  aria-label="Atualizar lista de postos"
                  className="w-11 h-11 flex items-center justify-center text-accent border border-accent/30 rounded-xl hover:bg-accent/10 transition-colors flex-shrink-0"
                >
                  ↻
                </button>
                <select
                  value={radius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  aria-label="Raio de busca"
                  className="text-sm bg-navy-800 border border-navy-600 text-slate-300 rounded-xl px-3 min-h-[44px] focus:outline-none focus:border-accent/40"
                >
                  <option value={2}>2 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={userPos ? () => refresh(userPos.lat, userPos.lng, radius) : undefined}
              className="mb-3"
            />
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="space-y-3">
            {!loading && stations.map((s) => <StationCard key={s.id} station={s} />)}
            {!loading && !stations.length && !error && userPos && (
              <div className="text-center py-8 bg-navy-800/50 rounded-xl border border-dashed border-navy-600">
                <p className="text-2xl mb-2" aria-hidden="true">🔍</p>
                <p className="text-slate-500 text-sm">Nenhum posto neste raio.</p>
                <button
                  onClick={() => navigate('/add-station')}
                  className="mt-2 text-sm text-accent hover:underline font-medium"
                >
                  Cadastrar o primeiro posto →
                </button>
              </div>
            )}
            {!loading && !userPos && (
              <div className="text-center py-8 bg-navy-800/50 rounded-xl border border-dashed border-navy-600">
                <p className="text-2xl mb-2" aria-hidden="true">📍</p>
                {gpsError ? (
                  <>
                    <p className="text-slate-400 text-sm font-medium">Não foi possível obter sua localização.</p>
                    <p className="text-slate-500 text-xs mt-1 px-6">
                      Verifique se o acesso à localização está permitido para este site nas configurações do navegador.
                    </p>
                    <button
                      onClick={() => { setGpsError(false); setGpsRetry((n) => n + 1); }}
                      className="mt-3 text-sm text-accent hover:underline font-medium"
                    >
                      Tentar novamente
                    </button>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Permita o acesso à sua localização para ver postos próximos.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
