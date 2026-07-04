import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import { FUEL_LABELS } from '../constants/fuels';

const inputClass =
  'w-full bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-[11px] text-slate-100 text-sm ' +
  'outline-none focus:border-accent/60 transition-colors placeholder-slate-600';

const labelClass =
  'block text-rep-unknown text-[11px] font-semibold uppercase tracking-[0.07em] mb-1.5';

export default function AddRefuel() {
  const { id } = useParams();
  const navigate = useNavigate();

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
    api.get(`/stations/${id}`).then(({ data }) => setStation(data)).catch(() => navigate('/'));
  }, [id, navigate]);

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
      <SuccessOverlay icon="⛽" title="Abastecimento registrado!">
        <p className="text-slate-600 text-[13px] mb-5">{submitted.station_name}</p>

        {/* Resumo */}
        <div className="bg-navy-950 border border-navy-600 rounded-[14px] px-4 py-3.5 mb-6 text-left">
          {[
            ['Combustível', FUEL_LABELS[submitted.fuel_type]],
            ['Litros', `${submitted.liters} L`],
            ['Total', `R$ ${parseFloat(submitted.total_value).toFixed(2)}`],
            ['Preço/L', submitted.price_per_liter ? `R$ ${submitted.price_per_liter}` : '—'],
            submitted.km ? ['KM', submitted.km.toLocaleString('pt-BR')] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex justify-between mb-1.5 last:mb-0">
              <span className="text-slate-600 text-[13px]">{label}</span>
              <span className="text-slate-200 text-[13px] font-semibold">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <OverlayPrimaryButton onClick={() => navigate('/profile')}>
            Ver histórico →
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate('/')}>
            Voltar ao mapa
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-accent transition-colors">
        ← Voltar
      </button>

      {station && (
        <div>
          <h1 className="text-xl font-bold text-slate-100">Registrar abastecimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">📍 {station.name}{station.brand ? ` • ${station.brand}` : ''}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 p-4 space-y-4">

          {/* Data e Combustível */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="refuel-date" className={labelClass}>Data</label>
              <input id="refuel-date" type="date" required value={form.refueled_at}
                onChange={(e) => set('refueled_at', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label htmlFor="refuel-fuel" className={labelClass}>Combustível</label>
              <select id="refuel-fuel" value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}
                className={`${inputClass} cursor-pointer`}>
                {Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Litros e Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="refuel-liters" className={labelClass}>Litros</label>
              <input id="refuel-liters" type="number" step="0.001" min="0.1" required
                placeholder="40.500" value={form.liters}
                onChange={(e) => set('liters', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label htmlFor="refuel-total" className={labelClass}>Total (R$)</label>
              <input id="refuel-total" type="number" step="0.01" min="0.01" required
                placeholder="235.00" value={form.total_value}
                onChange={(e) => set('total_value', e.target.value)}
                className={inputClass} />
            </div>
          </div>

          {/* Preço por litro (calculado) */}
          {pricePerLiter && (
            <div className="bg-accent/[0.07] border border-accent/20 rounded-[10px] px-3.5 py-2.5 flex justify-between items-center">
              <span className="text-rep-unknown text-[13px]">Preço por litro</span>
              <span className="text-accent font-bold text-[15px]">R$ {pricePerLiter}</span>
            </div>
          )}

          {/* KM */}
          <div>
            <label htmlFor="refuel-km" className={labelClass}>
              KM do veículo{' '}
              <span className="text-slate-700 font-normal normal-case">(opcional)</span>
            </label>
            <input id="refuel-km" type="number" min="0" placeholder="85000"
              value={form.km} onChange={(e) => set('km', e.target.value)}
              className={inputClass} />
          </div>

          {/* Observação */}
          <div>
            <label htmlFor="refuel-notes" className={labelClass}>
              Observação{' '}
              <span className="text-slate-700 font-normal normal-case">(opcional)</span>
            </label>
            <textarea id="refuel-notes" rows={2} maxLength={500} placeholder="Qualquer observação..."
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className={`${inputClass} resize-none leading-normal`} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-accent text-navy-950 font-bold py-3.5 rounded-xl hover:bg-accent-dark disabled:opacity-50 transition-colors shadow-lg shadow-accent/20"
        >
          {loading ? 'Salvando...' : '⛽ Registrar abastecimento'}
        </button>
      </form>
    </div>
  );
}
