import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/api';
import StationCard from '../components/StationCard';
import ReputationBadge from '../components/ReputationBadge';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const REPUTATION_COLORS = {
  good:    '#00e676',
  suspect: '#facc15',
  bad:     '#ef4444',
  unknown: '#64748b',
};

function openRoute(userPos, station) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${station.latitude},${station.longitude}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function createMarkerIcon(reputation) {
  const color = REPUTATION_COLORS[reputation] ?? REPUTATION_COLORS.unknown;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 24 12 24s12-16 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.9)"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// Armazena o último onLocation sem re-registrar o evento
function LocateUser({ onLocation }) {
  const map = useMap();
  const cbRef = useRef(onLocation);
  cbRef.current = onLocation;

  useEffect(() => {
    const handler = (e) => cbRef.current(e.latlng);
    map.locate({ setView: true, maxZoom: 14 });
    map.on('locationfound', handler);
    return () => map.off('locationfound', handler);
  }, [map]);

  return null;
}

export default function Home() {
  const [stations, setStations] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const navigate = useNavigate();

  const loadNear = useCallback(async (lat, lng, r) => {
    setLoading(true);
    try {
      const { data } = await api.get('/stations/near', { params: { lat, lng, radius: r } });
      setStations(data);
    } catch {
      // GPS indisponível
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega posição cacheada ao montar (fix: recarrega ao voltar para Home)
  useEffect(() => {
    const cached = localStorage.getItem('tanquecerto_pos');
    if (cached) {
      const pos = JSON.parse(cached);
      setUserPos(pos);
      loadNear(pos.lat, pos.lng, radius);
    }
  }, []);  // eslint-disable-line

  function handleLocation(latlng) {
    const pos = { lat: latlng.lat, lng: latlng.lng };
    setUserPos(pos);
    localStorage.setItem('tanquecerto_pos', JSON.stringify(pos));
    loadNear(pos.lat, pos.lng, radius);
  }

  function handleRadiusChange(r) {
    setRadius(r);
    if (userPos) loadNear(userPos.lat, userPos.lng, r);
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapContainer
          center={userPos ? [userPos.lat, userPos.lng] : [-15.78, -47.93]}
          zoom={userPos ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
          />
          <LocateUser onLocation={handleLocation} />

          {/* Marcador do usuário */}
          {userPos && (
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{ fillColor: '#f59e0b', fillOpacity: 1, color: '#fff', weight: 2 }}
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
                  <div style={{ padding: '14px 16px 11px', borderBottom: '1px solid #1a2d50' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.3 }}>
                      {s.name}
                    </p>
                    {s.brand && (
                      <p style={{ color: '#475569', fontSize: 12, margin: '3px 0 0' }}>{s.brand}</p>
                    )}
                  </div>

                  {/* Info + botões */}
                  <div style={{ padding: '12px 16px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <ReputationBadge reputation={s.reputation} />
                      <span style={{ color: '#475569', fontSize: 12 }}>📍 {s.distance} km</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {userPos && (
                        <button
                          onClick={() => openRoute(userPos, s)}
                          style={{
                            background: '#00e676', color: '#060d1f',
                            fontWeight: 700, fontSize: 13, border: 'none',
                            borderRadius: 10, padding: '10px 12px',
                            cursor: 'pointer', width: '100%',
                            boxShadow: '0 4px 16px rgba(0,230,118,0.22)',
                          }}
                        >
                          ⛽ Abastecer
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/stations/${s.id}`)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid #1a2d50',
                          color: '#94a3b8', fontWeight: 500, fontSize: 13,
                          borderRadius: 10, padding: '9px 12px',
                          cursor: 'pointer', width: '100%',
                        }}
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

      {/* Bottom panel */}
      <div className="bg-[#0a1628] border-t border-[#1a2d50]" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1a2d50]" />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                Postos próximos
                {!loading && stations.length > 0 && (
                  <span className="text-xs font-normal text-slate-500 bg-[#1a2d50] px-2 py-0.5 rounded-full">
                    {stations.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userPos
                  ? loading ? 'Buscando postos...' : `Raio de ${radius} km`
                  : 'Aguardando localização GPS...'}
              </p>
            </div>
            {userPos && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadNear(userPos.lat, userPos.lng, radius)}
                  className="text-xs text-[#f59e0b] border border-[#f59e0b]/30 px-2.5 py-1.5 rounded-lg hover:bg-[#f59e0b]/10 transition-colors"
                >
                  ↻
                </button>
                <select
                  value={radius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="text-sm bg-[#0d1a35] border border-[#1a2d50] text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#f59e0b]/40"
                >
                  <option value={2}>2 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </select>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="space-y-2">
            {!loading && stations.map((s) => <StationCard key={s.id} station={s} />)}
            {!loading && !stations.length && userPos && (
              <div className="text-center py-8 bg-[#0d1a35]/50 rounded-xl border border-dashed border-[#1a2d50]">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-slate-500 text-sm">Nenhum posto neste raio.</p>
                <button
                  onClick={() => navigate('/add-station')}
                  className="mt-2 text-sm text-[#f59e0b] hover:underline font-medium"
                >
                  Cadastrar o primeiro posto →
                </button>
              </div>
            )}
            {!loading && !userPos && (
              <div className="text-center py-8 bg-[#0d1a35]/50 rounded-xl border border-dashed border-[#1a2d50]">
                <p className="text-2xl mb-2">📍</p>
                <p className="text-slate-500 text-sm">Permita o acesso à sua localização para ver postos próximos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
