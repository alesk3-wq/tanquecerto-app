import { MapContainer } from 'react-leaflet';
import '../lib/leafletSetup';
import MapTileLayer from '../components/map/MapTileLayer';
import Button from '../components/Button';

// São Paulo — cenário do mapa decorativo das telas de auth
const AUTH_MAP_CENTER = [-23.55, -46.63];

export const authInputClass =
  'w-full bg-navy-950/70 border border-navy-600 rounded-xl px-4 py-3 text-sm text-slate-100 ' +
  'outline-none focus:border-accent/60 transition-colors placeholder-slate-600';

export const authLabelClass =
  'block text-slate-600 text-[11px] font-semibold uppercase tracking-[0.08em] mb-2';

export default function AuthLayout({ subtitle, cardTitle, children, footer }) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Mapa de fundo — estático, sem interação */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={AUTH_MAP_CENTER}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          touchZoom={false}
          boxZoom={false}
          attributionControl={false}
        >
          <MapTileLayer attribution={false} />
        </MapContainer>
      </div>

      {/* Overlay escuro para legibilidade */}
      <div
        className="absolute inset-0 z-[1]"
        style={{ background: 'linear-gradient(135deg, rgba(6,13,31,0.90) 0%, rgba(10,22,40,0.78) 50%, rgba(6,13,31,0.93) 100%)' }}
      />

      {/* Conteúdo centralizado */}
      <div className="relative z-[2] min-h-dvh flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-[400px] py-6">
          {/* Branding */}
          <div className="text-center mb-8">
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-[18px] bg-accent/12 border-[1.5px] border-accent/35 shadow-[0_0_40px_rgba(245,158,11,0.18)] flex items-center justify-center text-3xl mx-auto mb-4"
            >
              ⛽
            </div>
            <h1
              className="text-accent text-3xl font-bold tracking-tight"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              TanqueCerto
            </h1>
            <p className="text-slate-600 text-sm mt-1.5">{subtitle}</p>
          </div>

          {/* Card glassmorphism */}
          <div
            className="rounded-[20px] border px-7 pt-7 pb-6"
            style={{
              background: 'rgba(10, 22, 40, 0.82)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderColor: 'rgba(26, 45, 80, 0.9)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          >
            <h2 className="text-slate-100 font-semibold text-lg mb-5">{cardTitle}</h2>
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-slate-600 mt-5">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthSubmitButton({ loading, loadingText, children }) {
  return (
    <Button type="submit" disabled={loading} className="mt-1">
      {loading ? loadingText : children}
    </Button>
  );
}
