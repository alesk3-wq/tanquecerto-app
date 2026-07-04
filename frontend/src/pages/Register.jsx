import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';

const inputStyle = {
  width: '100%',
  background: 'rgba(6,13,31,0.7)',
  border: '1px solid #1a2d50',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  color: '#475569',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao cadastrar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* Mapa de fundo — estático, sem interação */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapContainer
          center={[-23.55, -46.63]}
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
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        </MapContainer>
      </div>

      {/* Overlay escuro */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(6,13,31,0.90) 0%, rgba(10,22,40,0.78) 50%, rgba(6,13,31,0.93) 100%)',
      }} />

      {/* Conteúdo centralizado */}
      <div style={{
        position: 'relative', zIndex: 2,
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400, paddingBlock: 24 }}>

          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'rgba(245,158,11,0.12)',
              border: '1.5px solid rgba(245,158,11,0.35)',
              boxShadow: '0 0 40px rgba(245,158,11,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
            }}>⛽</div>
            <h1 style={{
              fontFamily: 'Space Grotesk', color: '#f59e0b',
              fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px', margin: 0,
            }}>
              TanqueCerto
            </h1>
            <p style={{ color: '#475569', fontSize: 14, marginTop: 6 }}>
              Crie sua conta gratuita
            </p>
          </div>

          {/* Card glassmorphism */}
          <div style={{
            background: 'rgba(10, 22, 40, 0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(26, 45, 80, 0.9)',
            borderRadius: 20,
            padding: '28px 28px 24px',
            boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
          }}>
            <h2 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 18, margin: '0 0 22px' }}>
              Criar conta
            </h2>

            {error && (
              <div style={{
                background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(185,28,28,0.4)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 16,
              }}>
                <span style={{ color: '#f87171', fontSize: 13 }}>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="João Silva"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Senha</label>
                <input
                  type="password" required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Telefone{' '}
                  <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', background: '#f59e0b', color: '#060d1f',
                  fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 12,
                  padding: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 4px 24px rgba(245,158,11,0.3)',
                  transition: 'opacity 0.2s', marginTop: 4,
                }}
              >
                {loading ? 'Cadastrando...' : 'Criar conta →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#475569', marginTop: 20 }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: '#f59e0b', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
