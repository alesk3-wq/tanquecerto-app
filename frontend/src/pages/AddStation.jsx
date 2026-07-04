import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import ReputationBadge from '../components/ReputationBadge';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickMarker({ position, onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng) });
  return position ? <Marker position={position} /> : null;
}

export default function AddStation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', brand: '', address: '' });
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState([-15.78, -47.93]);
  const [createdStation, setCreatedStation] = useState(null);

  // Duplicate detection
  const [nearbyStations, setNearbyStations] = useState([]);
  const [checkingNearby, setCheckingNearby] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
    const cached = localStorage.getItem('tanquecerto_pos');
    if (cached) {
      const pos = JSON.parse(cached);
      setCenter([pos.lat, pos.lng]);
    } else {
      navigator.geolocation?.getCurrentPosition((p) => {
        setCenter([p.coords.latitude, p.coords.longitude]);
      });
    }
  }, [user, navigate]);

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

  const inputClass = "w-full bg-[#060d1f] border border-[#1a2d50] text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f59e0b] transition-colors placeholder-slate-600";

  // — Tela de sucesso —
  if (createdStation) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(6,13,31,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#0d1a35', border: '1px solid #1a2d50',
          borderRadius: 20, padding: '32px 28px',
          maxWidth: 380, width: '100%',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(0,230,118,0.12)', border: '1.5px solid rgba(0,230,118,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
          }}>✅</div>
          <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, margin: '0 0 8px', fontFamily: 'Space Grotesk' }}>
            Posto cadastrado!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 6px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{createdStation.name}</span> foi adicionado ao mapa.
          </p>
          <p style={{ color: '#475569', fontSize: 14, margin: '0 0 28px' }}>
            Deseja fazer a primeira avaliação deste posto?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => navigate(`/stations/${createdStation.id}/report`)}
              style={{
                background: '#f59e0b', color: '#060d1f', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 12, padding: '13px',
                cursor: 'pointer', width: '100%',
                boxShadow: '0 4px 20px rgba(245,158,11,0.25)',
              }}
            >Sim, avaliar agora →</button>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent', border: '1px solid #1a2d50',
                color: '#64748b', fontWeight: 500, fontSize: 14,
                borderRadius: 12, padding: '12px', cursor: 'pointer', width: '100%',
              }}
            >Não, voltar ao mapa</button>
          </div>
        </div>
      </div>
    );
  }

  // — Modal de confirmação de duplicata —
  if (showConfirmModal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(6,13,31,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#0d1a35', border: '1px solid #1a2d50',
          borderRadius: 20, padding: '28px 24px',
          maxWidth: 400, width: '100%',
          boxShadow: '0 32px 64px rgba(0,0,0,0.55)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(250,204,21,0.12)', border: '1.5px solid rgba(250,204,21,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, margin: '0 auto 14px',
            }}>⚠️</div>
            <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, margin: '0 0 6px', fontFamily: 'Space Grotesk' }}>
              Posto já cadastrado?
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Encontramos {nearbyStations.length} posto(s) a menos de 100m desta localização. É um deles?
            </p>
          </div>

          {/* Lista de postos próximos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {nearbyStations.slice(0, 3).map((s) => (
              <div key={s.id} style={{
                background: '#060d1f', border: '1px solid #1a2d50',
                borderRadius: 12, padding: '10px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </p>
                  {s.brand && (
                    <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>{s.brand}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <ReputationBadge reputation={s.reputation} />
                  <button
                    onClick={() => navigate(`/stations/${s.id}/report`)}
                    style={{
                      background: '#f59e0b', color: '#060d1f', fontWeight: 700,
                      fontSize: 11, border: 'none', borderRadius: 8,
                      padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >Avaliar</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={doSubmit}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid #1a2d50',
                color: '#94a3b8', fontWeight: 600, fontSize: 13,
                borderRadius: 12, padding: '12px', cursor: 'pointer', width: '100%',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Cadastrando...' : 'Não, é um posto diferente — cadastrar mesmo assim'}
            </button>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{
                background: 'transparent', border: 'none',
                color: '#475569', fontSize: 13,
                padding: '8px', cursor: 'pointer', width: '100%',
              }}
            >← Voltar ao formulário</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-[#f59e0b] transition-colors">
        ← Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-100">Cadastrar novo posto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome do posto *</label>
            <input required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} placeholder="Ex: Posto Ipiranga Centro" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Bandeira</label>
            <input value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className={inputClass} placeholder="Ex: Ipiranga, Shell, Petrobras..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Endereço</label>
            <input value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass} placeholder="Ex: Av. Paulista, 1000 - São Paulo" />
          </div>
        </div>

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] overflow-hidden">
          <div className="p-4 pb-2">
            <p className="font-medium text-slate-300">Localização *</p>
            <p className="text-sm text-slate-500">Clique no mapa para marcar o posto</p>
            {checkingNearby && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                Verificando postos próximos...
              </p>
            )}
            {position && !checkingNearby && nearbyStations.length === 0 && (
              <p className="text-xs text-[#00e676] mt-1">✓ Localização marcada — nenhum posto duplicado encontrado</p>
            )}
            {position && !checkingNearby && nearbyStations.length > 0 && (
              <p className="text-xs text-[#facc15] mt-1">
                ⚠️ {nearbyStations.length} posto(s) já cadastrado(s) nesta área
              </p>
            )}
          </div>
          <div style={{ height: 280 }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO'
              />
              <ClickMarker position={position} onSelect={handlePositionSelect} />
            </MapContainer>
          </div>
        </div>

        {/* Aviso inline de postos próximos */}
        {!checkingNearby && nearbyStations.length > 0 && (
          <div style={{
            background: 'rgba(250,204,21,0.06)',
            border: '1px solid rgba(250,204,21,0.25)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <p style={{ color: '#facc15', fontWeight: 600, fontSize: 13, margin: '0 0 10px' }}>
              ⚠️ Posto já cadastrado nesta região?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {nearbyStations.slice(0, 3).map((s) => (
                <div key={s.id} style={{
                  background: '#060d1f', border: '1px solid #1a2d50',
                  borderRadius: 10, padding: '9px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </p>
                    {s.brand && <p style={{ color: '#475569', fontSize: 11, margin: '1px 0 0' }}>{s.brand}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <ReputationBadge reputation={s.reputation} />
                    <button
                      type="button"
                      onClick={() => navigate(`/stations/${s.id}/report`)}
                      style={{
                        background: '#f59e0b', color: '#060d1f', fontWeight: 700,
                        fontSize: 11, border: 'none', borderRadius: 7,
                        padding: '5px 9px', cursor: 'pointer',
                      }}
                    >Avaliar</button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: '#475569', fontSize: 12, margin: '10px 0 0' }}>
              Se não for o mesmo posto, prossiga normalmente com o cadastro.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading || checkingNearby}
          className="w-full bg-[#f59e0b] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#d97706] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Cadastrando...' : nearbyStations.length > 0 ? 'Cadastrar mesmo assim' : 'Cadastrar posto'}
        </button>
      </form>
    </div>
  );
}
