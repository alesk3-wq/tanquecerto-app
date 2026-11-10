import { useState } from 'react';
import api from '../../api/api';
import { SheetButton } from '../BottomSheet';
import { Field, fieldClass } from '../tank/VehicleForm';
import { formatPhone } from '../../lib/phone';

// Perfil → Conta → Dados pessoais. E-mail só leitura (trocar e-mail exige
// reconfirmação — fluxo separado, ainda não existe).
export default function PersonalDataForm({ user, onSaved, onCancel }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(formatPhone(user.phone));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits && digits.length < 10) {
      setError('Telefone incompleto. Use DDD + número.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', { name: name.trim(), phone: digits || null });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.errors?.[0]?.msg ?? 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
          autoComplete="name" className={fieldClass} />
      </Field>
      <Field label="Telefone (opcional)">
        <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
          type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" className={fieldClass} />
      </Field>
      <Field label="E-mail">
        <input value={user.email} readOnly disabled className={`${fieldClass} opacity-60 cursor-not-allowed`} />
      </Field>

      {error && <p className="text-sm text-rep-bad">{error}</p>}

      <div className="space-y-3 pt-1">
        <SheetButton type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </SheetButton>
        <SheetButton onClick={onCancel} disabled={saving}>Cancelar</SheetButton>
      </div>
    </form>
  );
}
