import { useState } from 'react';
import { FUEL_LABELS, FUEL_ORDER } from '../../constants/fuels';
import { SheetButton } from '../BottomSheet';

export const fieldClass =
  'w-full bg-navy-950 border border-navy-600 text-slate-100 rounded-xl px-3.5 py-3 text-sm ' +
  'focus:outline-none focus:border-accent placeholder-slate-600';

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// Formulário de carro — usado no card "Adicionar carro" e no modo edição do
// card do carro. onSubmit recebe o payload pronto e devolve uma Promise;
// erro lançado com mensagem vira aviso no próprio formulário.
export default function VehicleForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    year: initial?.year != null ? String(initial.year) : '',
    default_fuel_type: initial?.default_fuel_type ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.brand.trim() || !form.model.trim() || !form.year) {
      setError('Preencha marca, modelo e ano.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: parseInt(form.year),
        default_fuel_type: form.default_fuel_type || null,
      });
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Erro ao salvar veículo.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Marca">
        <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
          placeholder="ex: Honda" className={fieldClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Modelo">
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="ex: City" className={fieldClass} />
        </Field>
        <Field label="Ano">
          <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="ex: 2015" type="number" inputMode="numeric" className={fieldClass} />
        </Field>
      </div>
      <Field label="Combustível padrão (opcional)">
        <select value={form.default_fuel_type}
          onChange={(e) => setForm({ ...form, default_fuel_type: e.target.value })}
          className={`${fieldClass} cursor-pointer`}>
          <option value="">Não definir</option>
          {FUEL_ORDER.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
        </select>
      </Field>

      {error && <p className="text-sm text-rep-bad">{error}</p>}

      <div className="space-y-3 pt-1">
        <SheetButton type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando...' : submitLabel}
        </SheetButton>
        {onCancel && <SheetButton onClick={onCancel} disabled={saving}>Cancelar</SheetButton>}
      </div>
    </form>
  );
}
