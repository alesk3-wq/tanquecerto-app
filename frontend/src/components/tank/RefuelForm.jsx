import { useState } from 'react';
import api from '../../api/api';
import { FUEL_LABELS, FUEL_ORDER } from '../../constants/fuels';
import { SheetButton } from '../BottomSheet';
import { Field, fieldClass } from './VehicleForm';

// Edição de um abastecimento, dentro do card do próprio abastecimento.
export default function RefuelForm({ refuel, vehicles, onSaved, onCancel }) {
  const [form, setForm] = useState({
    vehicle_id: refuel.vehicle_id ? String(refuel.vehicle_id) : '',
    fuel_type: refuel.fuel_type,
    liters: String(refuel.liters),
    total_value: String(refuel.total_value),
    km: refuel.km != null ? String(refuel.km) : '',
    full_tank: refuel.full_tank,
    notes: refuel.notes ?? '',
    refueled_at: refuel.refueled_at.slice(0, 10),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.liters || !form.total_value) {
      setError('Informe litros e valor total.');
      return;
    }
    if (form.vehicle_id && !form.km) {
      setError('Informe o KM do veículo.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/refuels/${refuel.id}`, {
        vehicle_id: form.vehicle_id ? parseInt(form.vehicle_id) : null,
        fuel_type: form.fuel_type,
        liters: parseFloat(form.liters),
        total_value: parseFloat(form.total_value),
        km: form.km ? parseInt(form.km) : null,
        full_tank: form.full_tank,
        notes: form.notes || null,
        refueled_at: form.refueled_at,
      });
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao salvar.');
      setSaving(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Veículo">
        <select value={form.vehicle_id} onChange={set('vehicle_id')} className={`${fieldClass} cursor-pointer`}>
          <option value="">Sem veículo</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.year})</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <input type="date" value={form.refueled_at} onChange={set('refueled_at')} className={fieldClass} />
        </Field>
        <Field label="Combustível">
          <select value={form.fuel_type} onChange={set('fuel_type')} className={`${fieldClass} cursor-pointer`}>
            {FUEL_ORDER.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
          </select>
        </Field>
        <Field label="Litros">
          <input type="number" step="0.001" min="0.1" inputMode="decimal" value={form.liters}
            onChange={set('liters')} className={fieldClass} />
        </Field>
        <Field label="Total (R$)">
          <input type="number" step="0.01" min="0.01" inputMode="decimal" value={form.total_value}
            onChange={set('total_value')} className={fieldClass} />
        </Field>
      </div>
      {form.vehicle_id && (
        <Field label="KM do veículo">
          <input type="number" min="0" inputMode="numeric" value={form.km} onChange={set('km')} className={fieldClass} />
        </Field>
      )}
      <label className="flex items-center gap-3 min-h-11 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={form.full_tank}
          onChange={(e) => setForm({ ...form, full_tank: e.target.checked })}
          className="accent-accent w-5 h-5" />
        Completei o tanque
      </label>
      <Field label="Observações (opcional)">
        <textarea value={form.notes} onChange={set('notes')} rows={2} className={`${fieldClass} resize-none`} />
      </Field>

      {error && <p className="text-sm text-rep-bad">{error}</p>}

      <div className="space-y-3 pt-1">
        <SheetButton type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </SheetButton>
        <SheetButton onClick={onCancel} disabled={saving}>Cancelar</SheetButton>
      </div>
    </form>
  );
}
