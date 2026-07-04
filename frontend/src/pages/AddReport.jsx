import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';

const TYPES = [
  { value: 'good',    label: '✅ Positivo',  desc: 'Combustível de qualidade, bom atendimento',  border: 'border-green-600/40',  bg: 'bg-green-900/20'  },
  { value: 'suspect', label: '⚠️ Suspeito',  desc: 'Algo me deixou desconfiado',                 border: 'border-orange-600/40', bg: 'bg-orange-900/20' },
  { value: 'bad',     label: '❌ Negativo',   desc: 'Problema claro: adulteração, falha, etc.',   border: 'border-red-600/40',    bg: 'bg-red-900/20'    },
];

const FUELS = [
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'ethanol',  label: 'Etanol'   },
  { value: 'diesel',   label: 'Diesel'   },
  { value: 'gnv',      label: 'GNV'      },
];

const TYPE_RESULT = {
  good:    { label: 'Positiva',  icon: '✅', color: '#00e676' },
  suspect: { label: 'Suspeita',  icon: '⚠️', color: '#facc15' },
  bad:     { label: 'Negativa',  icon: '❌', color: '#ef4444' },
};

export default function AddReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: '', fuel_type: 'gasoline', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.type) { setError('Selecione o tipo de avaliação.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/reports', { station_id: parseInt(id), ...form });
      setSubmitted(form.type);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const tc = TYPE_RESULT[submitted];
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(6,13,31,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#0d1a35',
          border: '1px solid #1a2d50',
          borderRadius: 20,
          padding: '36px 28px',
          maxWidth: 360, width: '100%',
          boxShadow: '0 32px 64px rgba(0,0,0,0.55)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(245,158,11,0.12)',
            border: '1.5px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 32px rgba(245,158,11,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 20px',
          }}>⭐</div>

          <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, margin: '0 0 8px', fontFamily: 'Space Grotesk' }}>
            Obrigado!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
            Sua avaliação foi enviada e já contribui para a reputação do posto.
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: `${tc.color}18`, border: `1px solid ${tc.color}40`,
            borderRadius: 20, padding: '7px 16px', marginBottom: 28,
          }}>
            <span style={{ fontSize: 14 }}>{tc.icon}</span>
            <span style={{ color: tc.color, fontSize: 13, fontWeight: 600 }}>
              Avaliação {tc.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#f59e0b', color: '#060d1f',
                fontWeight: 700, fontSize: 15, border: 'none',
                borderRadius: 12, padding: '13px',
                cursor: 'pointer', width: '100%',
                boxShadow: '0 4px 20px rgba(245,158,11,0.25)',
              }}
            >
              Ir para o mapa
            </button>
            <button
              onClick={() => navigate(`/stations/${id}`)}
              style={{
                background: 'transparent', border: '1px solid #1a2d50',
                color: '#64748b', fontWeight: 500, fontSize: 14,
                borderRadius: 12, padding: '12px',
                cursor: 'pointer', width: '100%',
              }}
            >
              Ver o posto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-[#f59e0b] transition-colors">
        ← Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-100">Avaliar posto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] p-4">
          <p className="font-medium text-slate-300 mb-3">Sua experiência foi...</p>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.type === t.value
                    ? `${t.border} ${t.bg}`
                    : 'border-[#1a2d50] hover:border-[#2a4070]'
                }`}
              >
                <input type="radio" name="type" value={t.value}
                  checked={form.type === t.value}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-0.5 accent-[#f59e0b]" />
                <div>
                  <p className="font-medium text-sm text-slate-200">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] p-4">
          <p className="font-medium text-slate-300 mb-3">Tipo de combustível</p>
          <div className="grid grid-cols-2 gap-2">
            {FUELS.map((f) => (
              <label key={f.value}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm transition-all ${
                  form.fuel_type === f.value
                    ? 'border-[#f59e0b]/50 bg-[#f59e0b]/10 text-[#f59e0b] font-medium'
                    : 'border-[#1a2d50] text-slate-400 hover:border-[#2a4070]'
                }`}
              >
                <input type="radio" name="fuel_type" value={f.value}
                  checked={form.fuel_type === f.value}
                  onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                  className="sr-only" />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] p-4">
          <label className="block font-medium text-slate-300 mb-2">
            Descrição <span className="text-slate-500 font-normal text-sm">(opcional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} maxLength={500}
            className="w-full bg-[#060d1f] border border-[#1a2d50] text-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#f59e0b] transition-colors placeholder-slate-600"
            placeholder="Conte sua experiência..."
          />
          <p className="text-xs text-slate-600 text-right mt-1">{form.description.length}/500</p>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-[#f59e0b] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#d97706] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  );
}
