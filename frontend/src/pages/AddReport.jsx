import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import Button from '../components/Button';
import { FUEL_ORDER, FUEL_LABELS } from '../constants/fuels';
import { repColor } from '../constants/reputation';

const TYPES = [
  { value: 'good',    label: '✅ Positivo',  desc: 'Combustível de qualidade, bom atendimento',  border: 'border-rep-good/40',    bg: 'bg-rep-good/10'    },
  { value: 'suspect', label: '⚠️ Suspeito',  desc: 'Algo me deixou desconfiado',                 border: 'border-rep-suspect/40', bg: 'bg-rep-suspect/10' },
  { value: 'bad',     label: '❌ Negativo',   desc: 'Problema claro: adulteração, falha, etc.',   border: 'border-rep-bad/40',     bg: 'bg-rep-bad/10'     },
];

const TYPE_RESULT = {
  good:    { label: 'Positiva', icon: '✅' },
  suspect: { label: 'Suspeita', icon: '⚠️' },
  bad:     { label: 'Negativa', icon: '❌' },
};

export default function AddReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [form, setForm] = useState({ type: '', fuel_type: prefill?.fuel_type ?? 'gasoline' });
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

        <div className="flex flex-col gap-3">
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
      <h1 className="text-xl font-bold text-slate-100">Avaliar posto</h1>
      {prefill && (
        <p className="text-xs text-slate-500 -mt-2">
          Combustível preenchido automaticamente do seu abastecimento.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
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

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4">
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

        <Button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          Prefiro aguardar para testar o combustível
        </Button>
      </form>
    </div>
  );
}
