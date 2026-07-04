import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';

const FUEL_LABELS = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };

const inputStyle = {
  width: '100%', background: '#060d1f', border: '1px solid #1a2d50',
  borderRadius: 10, padding: '11px 14px', color: '#f1f5f9',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', color: '#64748b', fontSize: 11,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7,
};

export default function AddRefuel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  const [station, setStation]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({
    fuel_type:   'gasoline',
    liters:      '',
    total_value: '',
    km:          '',
    notes:       '',
    refueled_at: today,
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/stations/${id}`).then(({ data }) => setStation(data)).catch(() => navigate('/'));
  }, [id, user, navigate]);

  const pricePerLiter = form.liters && form.total_value
    ? (parseFloat(form.total_value) / parseFloat(form.liters)).toFixed(3)
    : null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.liters || !form.total_value) { setError('Informe litros e valor total.'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        station_id:  parseInt(id),
        fuel_type:   form.fuel_type,
        liters:      parseFloat(form.liters),
        total_value: parseFloat(form.total_value),
        refueled_at: form.refueled_at,
        km:          form.km ? parseInt(form.km) : null,
        notes:       form.notes || null,
      };
      await api.post('/refuels', payload);
      setSubmitted({ ...payload, price_per_liter: pricePerLiter, station_name: station?.name });
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao registrar.');
    } finally {
      setLoading(false);
    }
  }

  // — Tela de sucesso —
  if (submitted) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(6,13,31,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: '#0d1a35', border: '1px solid #1a2d50', borderRadius: 20,
          padding: '32px 28px', maxWidth: 380, width: '100%',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5)', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(245,158,11,0.12)', border: '1.5px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 28px rgba(245,158,11,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 18px',
          }}>⛽</div>

          <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 20, margin: '0 0 6px', fontFamily: 'Space Grotesk' }}>
            Abastecimento registrado!
          </h2>
          <p style={{ color: '#475569', fontSize: 13, margin: '0 0 20px' }}>
            {submitted.station_name}
          </p>

          {/* Resumo */}
          <div style={{
            background: '#060d1f', border: '1px solid #1a2d50', borderRadius: 14,
            padding: '14px 16px', marginBottom: 24, textAlign: 'left',
          }}>
            {[
              ['Combustível', FUEL_LABELS[submitted.fuel_type]],
              ['Litros', `${submitted.liters} L`],
              ['Total', `R$ ${parseFloat(submitted.total_value).toFixed(2)}`],
              ['Preço/L', submitted.price_per_liter ? `R$ ${submitted.price_per_liter}` : '—'],
              submitted.km ? ['KM', submitted.km.toLocaleString('pt-BR')] : null,
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#475569', fontSize: 13 }}>{label}</span>
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: '#f59e0b', color: '#060d1f', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 12, padding: '13px',
                cursor: 'pointer', width: '100%',
                boxShadow: '0 4px 20px rgba(245,158,11,0.25)',
              }}
            >Ver histórico →</button>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent', border: '1px solid #1a2d50',
                color: '#64748b', fontWeight: 500, fontSize: 14,
                borderRadius: 12, padding: '12px', cursor: 'pointer', width: '100%',
              }}
            >Voltar ao mapa</button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = { ...inputStyle };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-[#f59e0b] transition-colors">
        ← Voltar
      </button>

      {station && (
        <div>
          <h1 className="text-xl font-bold text-slate-100">Registrar abastecimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">📍 {station.name}{station.brand ? ` • ${station.brand}` : ''}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-[#0d1a35] rounded-2xl border border-[#1a2d50] p-4 space-y-4">

          {/* Data e Combustível */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" required value={form.refueled_at}
                onChange={(e) => set('refueled_at', e.target.value)}
                style={inputClass} />
            </div>
            <div>
              <label style={labelStyle}>Combustível</label>
              <select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}
                style={{ ...inputClass, cursor: 'pointer' }}>
                {Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Litros e Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Litros</label>
              <input type="number" step="0.001" min="0.1" required
                placeholder="40.500" value={form.liters}
                onChange={(e) => set('liters', e.target.value)}
                style={inputClass} />
            </div>
            <div>
              <label style={labelStyle}>Total (R$)</label>
              <input type="number" step="0.01" min="0.01" required
                placeholder="235.00" value={form.total_value}
                onChange={(e) => set('total_value', e.target.value)}
                style={inputClass} />
            </div>
          </div>

          {/* Preço por litro (calculado) */}
          {pricePerLiter && (
            <div style={{
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Preço por litro</span>
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15 }}>R$ {pricePerLiter}</span>
            </div>
          )}

          {/* KM */}
          <div>
            <label style={labelStyle}>
              KM do veículo{' '}
              <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
            </label>
            <input type="number" min="0" placeholder="85000"
              value={form.km} onChange={(e) => set('km', e.target.value)}
              style={inputClass} />
          </div>

          {/* Observação */}
          <div>
            <label style={labelStyle}>
              Observação{' '}
              <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
            </label>
            <textarea rows={2} maxLength={500} placeholder="Qualquer observação..."
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
              style={{ ...inputClass, resize: 'none', lineHeight: 1.5 }} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-[#f59e0b] text-[#060d1f] font-bold py-3.5 rounded-xl hover:bg-[#d97706] disabled:opacity-50 transition-colors shadow-lg shadow-[#f59e0b]/20"
        >
          {loading ? 'Salvando...' : '⛽ Registrar abastecimento'}
        </button>
      </form>
    </div>
  );
}
