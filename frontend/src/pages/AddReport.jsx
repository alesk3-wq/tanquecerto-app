import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import { FUEL_ORDER, FUEL_LABELS } from '../constants/fuels';
import { repColor } from '../constants/reputation';

const TYPES = [
  { value: 'good',    label: '✅ Positivo',  desc: 'Combustível de qualidade, bom atendimento',  border: 'border-green-600/40',  bg: 'bg-green-900/20'  },
  { value: 'suspect', label: '⚠️ Suspeito',  desc: 'Algo me deixou desconfiado',                 border: 'border-orange-600/40', bg: 'bg-orange-900/20' },
  { value: 'bad',     label: '❌ Negativo',   desc: 'Problema claro: adulteração, falha, etc.',   border: 'border-red-600/40',    bg: 'bg-red-900/20'    },
];

const TYPE_RESULT = {
  good:    { label: 'Positiva', icon: '✅' },
  suspect: { label: 'Suspeita', icon: '⚠️' },
  bad:     { label: 'Negativa', icon: '❌' },
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
    const color = repColor(submitted);
    return (
      <SuccessOverlay icon="⭐" title="Obrigado!">
        <p className="text-rep-unknown text-sm leading-relaxed mb-5">
          Sua avaliação foi enviada e já contribui para a reputação do posto.
        </p>

        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7"
          style={{ background: `${color}18`, border: `1px solid ${color}40` }}
        >
          <span className="text-sm" aria-hidden="true">{tc.icon}</span>
          <span className="text-[13px] font-semibold" style={{ color }}>
            Avaliação {tc.label}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <OverlayPrimaryButton onClick={() => navigate('/')}>
            Ir para o mapa
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate(`/stations/${id}`)}>
            Ver o posto
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-accent transition-colors">
        ← Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-100">Avaliar posto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 p-4">
          <p className="font-medium text-slate-300 mb-3">Sua experiência foi...</p>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.type === t.value
                    ? `${t.border} ${t.bg}`
                    : 'border-navy-600 hover:border-navy-500'
                }`}
              >
                <input type="radio" name="type" value={t.value}
                  checked={form.type === t.value}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-0.5 accent-accent" />
                <div>
                  <p className="font-medium text-sm text-slate-200">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-navy-800 rounded-2xl border border-navy-600 p-4">
          <p className="font-medium text-slate-300 mb-3">Tipo de combustível</p>
          <div className="grid grid-cols-2 gap-2">
            {FUEL_ORDER.map((f) => (
              <label key={f}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm transition-all ${
                  form.fuel_type === f
                    ? 'border-accent/50 bg-accent/10 text-accent font-medium'
                    : 'border-navy-600 text-slate-400 hover:border-navy-500'
                }`}
              >
                <input type="radio" name="fuel_type" value={f}
                  checked={form.fuel_type === f}
                  onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                  className="sr-only" />
                {FUEL_LABELS[f]}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-navy-800 rounded-2xl border border-navy-600 p-4">
          <label htmlFor="report-description" className="block font-medium text-slate-300 mb-2">
            Descrição <span className="text-slate-500 font-normal text-sm">(opcional)</span>
          </label>
          <textarea
            id="report-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} maxLength={500}
            className="w-full bg-navy-950 border border-navy-600 text-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent transition-colors placeholder-slate-600"
            placeholder="Conte sua experiência..."
          />
          <p className="text-xs text-slate-600 text-right mt-1">{form.description.length}/500</p>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-accent text-navy-950 font-bold py-3 rounded-xl hover:bg-accent-dark disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  );
}
