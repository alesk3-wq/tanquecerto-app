import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import ErrorMessage from '../components/ErrorMessage';
import SuccessOverlay, { OverlayPrimaryButton, OverlaySecondaryButton } from '../components/SuccessOverlay';
import Button from '../components/Button';
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
    vehicle_id:  '',
    fuel_type:   'gasoline',
    liters:      '',
    total_value: '',
    km:          '',
    notes:       '',
    refueled_at: today,
  });

  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ brand: '', model: '', year: '' });
  const [vehicleError, setVehicleError] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    api.get(`/stations/${id}`).then(({ data }) => setStation(data)).catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    api.get('/vehicles/mine').then(({ data }) => setVehicles(data)).catch(() => {});
  }, []);

  async function addVehicle() {
    setVehicleError('');
    if (!newVehicle.brand.trim() || !newVehicle.model.trim() || !newVehicle.year) {
      setVehicleError('Preencha marca, modelo e ano.');
      return;
    }
    setSavingVehicle(true);
    try {
      const { data } = await api.post('/vehicles', {
        brand: newVehicle.brand.trim(),
        model: newVehicle.model.trim(),
        year: parseInt(newVehicle.year),
      });
      setVehicles((prev) => [data, ...prev]);
      set('vehicle_id', String(data.id));
      setNewVehicle({ brand: '', model: '', year: '' });
    } catch (err) {
      setVehicleError(err.response?.data?.error ?? 'Erro ao adicionar veículo.');
    } finally {
      setSavingVehicle(false);
    }
  }

  const pricePerLiter = form.liters && form.total_value
    ? (parseFloat(form.total_value) / parseFloat(form.liters)).toFixed(3)
    : null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.liters || !form.total_value) { setError('Informe litros e valor total.'); return; }
    if (form.vehicle_id && !form.km) { setError('Informe o KM do veículo (necessário para calcular o consumo).'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        station_id:  parseInt(id),
        vehicle_id:  form.vehicle_id ? parseInt(form.vehicle_id) : null,
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

        <div className="flex flex-col gap-3">
          <OverlayPrimaryButton
            onClick={() => navigate(`/stations/${id}/report`, {
              state: { prefill: { fuel_type: submitted.fuel_type, refueled_at: submitted.refueled_at } },
            })}
          >
            Avaliar agora →
          </OverlayPrimaryButton>
          <OverlaySecondaryButton onClick={() => navigate('/')}>
            Aguardar para testar o combustível
          </OverlaySecondaryButton>
        </div>
      </SuccessOverlay>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
      {station && (
        <div>
          <h1 className="text-xl font-bold text-slate-100">Registrar abastecimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">📍 {station.name}{station.brand ? ` • ${station.brand}` : ''}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <ErrorMessage message={error} />

        <div className="bg-navy-800 rounded-2xl border border-navy-600 shadow-lg shadow-black/20 p-4 space-y-4">

          {/* Veículo */}
          <div>
            <label htmlFor="refuel-vehicle" className={labelClass}>
              Veículo{' '}
              <span className="text-slate-700 font-normal normal-case">(opcional)</span>
            </label>
            <select id="refuel-vehicle" value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)}
              className={`${inputClass} cursor-pointer`}>
              <option value="">Não informar</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.year})</option>
              ))}
            </select>
            {form.vehicle_id && (
              <p className="text-xs text-slate-600 mt-1.5">
                Informe o KM abaixo pra acompanharmos o consumo deste carro.
              </p>
            )}
          </div>

          {vehicles.length === 0 && (
            <div className="bg-navy-950 border border-navy-600 rounded-[10px] px-3.5 py-3 space-y-2">
              <p className="text-xs text-slate-500">
                Cadastre seu carro pra acompanhar o consumo médio nos postos que visitar.
              </p>
              <ErrorMessage message={vehicleError} />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newVehicle.brand}
                  onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                  placeholder="Marca" className={`${inputClass} col-span-2`} />
                <input
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  placeholder="Modelo" className={inputClass} />
                <input
                  value={newVehicle.year} type="number"
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                  placeholder="Ano" className={inputClass} />
              </div>
              <button type="button" onClick={addVehicle} disabled={savingVehicle}
                className="w-full bg-navy-800 border border-navy-600 text-slate-200 font-semibold text-sm rounded-lg px-3 py-2 disabled:opacity-50">
                {savingVehicle ? 'Salvando...' : 'Salvar carro'}
              </button>
            </div>
          )}

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
              {form.vehicle_id ? (
                <span className="text-rep-suspect font-normal normal-case">(obrigatório)</span>
              ) : (
                <span className="text-slate-700 font-normal normal-case">(opcional)</span>
              )}
            </label>
            <input id="refuel-km" type="number" min="0" placeholder="85000" required={!!form.vehicle_id}
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

        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : '⛽ Registrar abastecimento'}
        </Button>
      </form>
    </div>
  );
}
